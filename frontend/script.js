// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api'; // URL base da sua API backend

    // Elementos da UI
    const views = document.querySelectorAll('.view');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const activitiesView = document.getElementById('activities-view');
    const activityFormView = document.getElementById('activity-form-view');
    const mySubscriptionsView = document.getElementById('my-subscriptions-view'); // Adicionada

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const activityForm = document.getElementById('activity-form');

    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const messageArea = document.getElementById('message-area');
    const activitiesListDiv = document.getElementById('activities-list');
    const mySubscriptionsListDiv = document.getElementById('my-subscriptions-list'); // Adicionada

    const navLinks = document.getElementById('nav-links');
    const addActivityButton = document.getElementById('add-activity-button');
    const cancelActivityFormButton = document.getElementById('cancel-activity-form');
    const activityFormTitle = document.getElementById('activity-form-title');


    // --- Gerenciamento de Estado Simples ---
    let currentUser = null; // { token: '...', role: '...', name: '...' }
    let currentActivities = []; // Cache simples das atividades

    // --- Funções Auxiliares ---

    // Mostra uma mensagem para o usuário
    function showMessage(message, isError = false) {
        messageArea.textContent = message;
        messageArea.className = 'message-area'; // Reset class
        if (message) {
            messageArea.classList.add(isError ? 'error' : 'success');
        }
    }

    // Limpa a área de mensagens
    function clearMessage() {
        messageArea.textContent = '';
        messageArea.className = 'message-area';
    }

    // Mostra apenas a view especificada
    function showView(viewId) {
        clearMessage(); // Limpa mensagens ao trocar de view
        views.forEach(view => {
            view.classList.remove('active');
        });
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.classList.add('active');
        } else {
            console.error(`View com ID '${viewId}' não encontrada.`);
            loginView.classList.add('active'); // Fallback para login
        }
        updateNavLinks(); // Atualiza links de navegação
    }

    // Salva o token e dados do usuário no localStorage
    function saveUserSession(token, user) {
         try {
            localStorage.setItem('authToken', token);
            localStorage.setItem('userData', JSON.stringify(user)); // Salva role, name, etc.
            currentUser = { token, ...user };
            console.log("Sessão salva:", currentUser);
        } catch (e) {
            console.error("Erro ao salvar sessão no localStorage:", e);
            showMessage("Não foi possível salvar sua sessão. Verifique as permissões do navegador.", true);
        }
    }

    // Carrega a sessão do usuário do localStorage
    function loadUserSession() {
        const token = localStorage.getItem('authToken');
        const userDataString = localStorage.getItem('userData');
        if (token && userDataString) {
            try {
                const user = JSON.parse(userDataString);
                currentUser = { token, ...user };
                 console.log("Sessão carregada:", currentUser);
                return true;
            } catch (e) {
                 console.error("Erro ao carregar sessão do localStorage:", e);
                 clearUserSession(); // Limpa dados inválidos
                 return false;
            }
        }
        currentUser = null;
        return false;
    }

    // Limpa a sessão do usuário
    function clearUserSession() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        currentUser = null;
         console.log("Sessão limpa.");
    }

    // Faz chamadas para a API
    async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = false) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        if (requiresAuth) {
            if (!currentUser || !currentUser.token) {
                console.error("Erro: Tentativa de chamada autenticada sem token.");
                showMessage("Você precisa estar logado para realizar esta ação.", true);
                showView('login-view'); // Redireciona para login
                return null; // Indica falha na chamada
            }
            options.headers['Authorization'] = `Bearer ${currentUser.token}`;
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json(); // Tenta parsear JSON mesmo em erros

            if (!response.ok) {
                // Tenta usar a mensagem de erro da API, senão usa uma genérica
                const errorMessage = data?.message || `Erro ${response.status}: ${response.statusText}`;
                console.error(`API Error (${response.status}): ${errorMessage}`, data);
                showMessage(errorMessage, true);
                if (response.status === 401 || response.status === 403) { // Unauthorized ou Forbidden
                    // Token inválido ou expirado, força logout
                    handleLogout();
                }
                return null; // Indica falha
            }
            // Sucesso
            clearMessage(); // Limpa mensagens de erro anteriores em caso de sucesso
            return data;

        } catch (error) {
            console.error('Erro na chamada da API:', error);
            showMessage('Erro de rede ou ao conectar com o servidor. Tente novamente.', true);
            return null; // Indica falha
        }
    }


    // --- Lógica das Views e Ações ---

    // Atualiza os links de navegação e botões baseado no estado de login/role
    function updateNavLinks() {
        navLinks.innerHTML = ''; // Limpa links existentes

        if (currentUser) {
            const welcomeMsg = document.createElement('span');
            welcomeMsg.textContent = `Bem-vindo(a), ${currentUser.name || 'Usuário'}! `;
            navLinks.appendChild(welcomeMsg);

            const activitiesLink = document.createElement('a');
            activitiesLink.href = '#';
            activitiesLink.textContent = 'Ver Atividades';
            activitiesLink.onclick = (e) => { e.preventDefault(); showView('activities-view'); fetchActivities(); };
            navLinks.appendChild(activitiesLink);

             if (currentUser.role === 'comum') {
                const mySubsLink = document.createElement('a');
                mySubsLink.href = '#';
                mySubsLink.textContent = 'Minhas Inscrições';
                mySubsLink.onclick = (e) => { e.preventDefault(); showView('my-subscriptions-view'); fetchMySubscriptions(); };
                navLinks.appendChild(mySubsLink);
            }


            const logoutButton = document.createElement('button');
            logoutButton.textContent = 'Sair';
            logoutButton.onclick = handleLogout;
            navLinks.appendChild(logoutButton);

            // Mostra/Esconde botão de adicionar atividade para admin
             addActivityButton.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';

        } else {
            // Usuário não logado, mostra links de Login/Registro (já estão nos forms)
             addActivityButton.style.display = 'none';
        }

        // Controla visibilidade de elementos com a classe 'admin-only'
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
        });
    }

    // Manipulador de Registro
    async function handleRegister(event) {
        event.preventDefault();
        showMessage("Registrando...", false);

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;


        const result = await apiCall('/users/register', 'POST', { name, email, password, role });

        if (result) {
            showMessage('Registro bem-sucedido! Faça o login.', false);
            registerForm.reset();
            showView('login-view');
        } else {
             // Mensagem de erro já foi mostrada por apiCall
            console.error("Falha no registro.");
        }
    }

    // Manipulador de Login
    async function handleLogin(event) {
        event.preventDefault();
        showMessage("Entrando...", false);

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // NOTA: O backend precisa ter uma rota /api/auth/login que retorne { token, user: { id, name, email, role } }
        const result = await apiCall('/auth/login', 'POST', { email, password });

        if (result && result.token && result.user) {
             saveUserSession(result.token, result.user);
             loginForm.reset();
             showMessage(`Login bem-sucedido! Bem-vindo(a) ${result.user.name}.`, false);
             showView('activities-view'); // Vai para a lista de atividades
             fetchActivities(); // Carrega as atividades
        } else if (!result) {
            // Erro já tratado por apiCall
             console.error("Falha no login.");
        } else {
            // Caso a API retorne sucesso mas sem token/user (improvável se bem feita)
            showMessage("Erro inesperado ao fazer login. Tente novamente.", true);
             console.error("Resposta de login inválida:", result);
        }
    }

    // Manipulador de Logout
    function handleLogout() {
        clearUserSession();
        showMessage('Você saiu da sua conta.', false);
        showView('login-view');
        activitiesListDiv.innerHTML = ''; // Limpa lista de atividades
        mySubscriptionsListDiv.innerHTML = ''; // Limpa lista de inscrições
        currentActivities = []; // Limpa cache
    }

    // Busca e exibe atividades
    async function fetchActivities() {
        if (!currentUser) {
             showView('login-view');
             return;
        }
        activitiesListDiv.innerHTML = '<p>Carregando atividades...</p>';
        const data = await apiCall('/activities', 'GET', null, true); // Requer autenticação

        if (data && Array.isArray(data.activities)) {
             currentActivities = data.activities; // Atualiza cache
            displayActivities(currentActivities);
        } else {
            activitiesListDiv.innerHTML = '<p>Não foi possível carregar as atividades.</p>';
        }
    }

    // Renderiza a lista de atividades na tela
    function displayActivities(activities) {
        activitiesListDiv.innerHTML = ''; // Limpa a lista atual

        if (activities.length === 0) {
            activitiesListDiv.innerHTML = '<p>Nenhuma atividade disponível no momento.</p>';
            return;
        }

        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.dataset.id = activity.id; // Armazena ID no elemento

            // Calcula vagas restantes
            const participantsCount = activity.participants ? activity.participants.length : 0;
            const availableSlots = activity.maxParticipants - participantsCount;
            const isFull = availableSlots <= 0;
            const userIsSubscribed = currentUser && activity.participants && activity.participants.includes(currentUser.id); // O backend precisa popular 'participants' com IDs

            item.innerHTML = `
                <h3>${activity.title}</h3>
                <p><strong>Descrição:</strong> ${activity.description}</p>
                <p><strong>Data:</strong> ${new Date(activity.date).toLocaleString('pt-BR')}</p>
                <p><strong>Local:</strong> ${activity.location}</p>
                <p><strong>Vagas:</strong> ${participantsCount} / ${activity.maxParticipants} (${isFull ? 'Lotado' : availableSlots + ' restantes'})</p>
                <div class="activity-actions"></div>
            `;

             const actionsDiv = item.querySelector('.activity-actions');

             // --- Botões de Ação ---
             if (currentUser.role === 'admin') {
                // Botões de Admin
                const editButton = document.createElement('button');
                editButton.textContent = 'Editar';
                editButton.onclick = () => showActivityForm(activity); // Passa a atividade para preencher o form
                actionsDiv.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.style.backgroundColor = '#d9534f'; // Vermelho para exclusão
                 deleteButton.onclick = () => handleDeleteActivity(activity.id);
                actionsDiv.appendChild(deleteButton);

             } else if (currentUser.role === 'comum') {
                 // Botões de Usuário Comum
                 if (userIsSubscribed) {
                     const unsubscribeButton = document.createElement('button');
                     unsubscribeButton.textContent = 'Cancelar Inscrição';
                     unsubscribeButton.className = 'unsubscribe-button';
                     unsubscribeButton.onclick = () => handleUnsubscribe(activity.id);
                     actionsDiv.appendChild(unsubscribeButton);
                 } else if (!isFull) {
                     const subscribeButton = document.createElement('button');
                     subscribeButton.textContent = 'Inscrever-se';
                     subscribeButton.onclick = () => handleSubscribe(activity.id);
                     actionsDiv.appendChild(subscribeButton);
                 } else {
                     const fullButton = document.createElement('button');
                     fullButton.textContent = 'Lotado';
                     fullButton.disabled = true;
                     actionsDiv.appendChild(fullButton);
                 }
             }

            activitiesListDiv.appendChild(item);
        });
    }

     // Mostra o formulário para criar ou editar atividade
    function showActivityForm(activity = null) {
        clearMessage();
        activityForm.reset(); // Limpa o formulário
        document.getElementById('activity-id').value = ''; // Limpa ID oculto

        if (activity) {
            // Modo Edição
            activityFormTitle.textContent = 'Editar Atividade';
            document.getElementById('activity-id').value = activity.id;
            document.getElementById('activity-title').value = activity.title;
            document.getElementById('activity-description').value = activity.description;
            // Formatar data para datetime-local (YYYY-MM-DDTHH:mm)
             try {
                const date = new Date(activity.date);
                // Ajusta para o fuso horário local antes de formatar
                const timezoneOffset = date.getTimezoneOffset() * 60000; // offset em ms
                const localISOTime = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
                 document.getElementById('activity-date').value = localISOTime;
            } catch (e) { console.error("Erro ao formatar data para edição:", e); }

            document.getElementById('activity-location').value = activity.location;
            document.getElementById('activity-max-participants').value = activity.maxParticipants;
        } else {
            // Modo Criação
            activityFormTitle.textContent = 'Criar Nova Atividade';
        }
        showView('activity-form-view');
    }


    // Manipulador para salvar (criar/editar) atividade
    async function handleSaveActivity(event) {
        event.preventDefault();
         if (currentUser.role !== 'admin') return; // Segurança extra

        const id = document.getElementById('activity-id').value;
        const activityData = {
            title: document.getElementById('activity-title').value,
            description: document.getElementById('activity-description').value,
            date: document.getElementById('activity-date').value,
            location: document.getElementById('activity-location').value,
            maxParticipants: parseInt(document.getElementById('activity-max-participants').value, 10),
        };

         // Validação básica de número de participantes
         if (isNaN(activityData.maxParticipants) || activityData.maxParticipants < 1) {
            showMessage("Número máximo de participantes deve ser pelo menos 1.", true);
            return;
        }

        let result;
        if (id) {
            // Edição (PUT) - O backend precisa ter a rota PUT /api/activities/:id
            showMessage("Atualizando atividade...", false);
            result = await apiCall(`/activities/${id}`, 'PUT', activityData, true);
        } else {
            // Criação (POST) - O backend precisa ter a rota POST /api/activities
            showMessage("Criando atividade...", false);
            result = await apiCall('/activities', 'POST', activityData, true);
        }

        if (result) {
             showMessage(`Atividade ${id ? 'atualizada' : 'criada'} com sucesso!`, false);
            activityForm.reset();
             showView('activities-view');
             fetchActivities(); // Recarrega a lista
        } else {
             console.error("Falha ao salvar atividade.");
              // Mensagem de erro já mostrada por apiCall
        }
    }

    // Manipulador para deletar atividade
    async function handleDeleteActivity(activityId) {
        if (currentUser.role !== 'admin') return;
        if (!confirm('Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.')) {
            return;
        }
        showMessage("Excluindo atividade...", false);
        // O backend precisa ter a rota DELETE /api/activities/:id
        const result = await apiCall(`/activities/${activityId}`, 'DELETE', null, true);

        if (result) {
            showMessage('Atividade excluída com sucesso!', false);
            fetchActivities(); // Recarrega a lista
        } else {
             console.error("Falha ao excluir atividade.");
             // Mensagem de erro já mostrada por apiCall
        }
    }

    // Manipulador para inscrever-se em uma atividade
    async function handleSubscribe(activityId) {
         if (currentUser.role !== 'comum') return;
        showMessage("Processando inscrição...", false);
         // O backend precisa ter a rota POST /api/activities/:id/subscribe
        const result = await apiCall(`/activities/${activityId}/subscribe`, 'POST', null, true);

        if (result) {
            showMessage('Inscrição realizada com sucesso!', false);
            fetchActivities(); // Recarrega a lista para atualizar status/vagas
        } else {
             console.error("Falha na inscrição.");
             // Mensagem de erro já mostrada por apiCall
        }
    }

    // Manipulador para cancelar inscrição
    async function handleUnsubscribe(activityId) {
        if (currentUser.role !== 'comum') return;
         if (!confirm('Tem certeza que deseja cancelar sua inscrição nesta atividade?')) {
            return;
        }
        showMessage("Cancelando inscrição...", false);
        // O backend precisa ter a rota DELETE /api/activities/:id/subscribe
        const result = await apiCall(`/activities/${activityId}/subscribe`, 'DELETE', null, true);

        if (result) {
            showMessage('Inscrição cancelada com sucesso!', false);
            fetchActivities(); // Recarrega a lista para atualizar status/vagas
             fetchMySubscriptions(); // Atualiza a view de minhas inscrições, se estiver visível
        } else {
             console.error("Falha ao cancelar inscrição.");
            // Mensagem de erro já mostrada por apiCall
        }
    }

     // Busca e exibe as inscrições do usuário logado
    async function fetchMySubscriptions() {
        if (!currentUser || currentUser.role !== 'comum') {
             // Não faz sentido para admin ou não logado
            mySubscriptionsListDiv.innerHTML = '';
             return;
        }
        mySubscriptionsListDiv.innerHTML = '<p>Carregando suas inscrições...</p>';
         // O backend precisa ter uma rota GET /api/users/me/subscriptions ou similar
        const data = await apiCall('/users/me/subscriptions', 'GET', null, true);

        if (data && Array.isArray(data.subscriptions)) {
            displayMySubscriptions(data.subscriptions);
        } else {
            mySubscriptionsListDiv.innerHTML = '<p>Não foi possível carregar suas inscrições.</p>';
        }
    }

     // Renderiza a lista de "Minhas Inscrições"
    function displayMySubscriptions(subscriptions) {
        mySubscriptionsListDiv.innerHTML = ''; // Limpa a lista atual

        if (subscriptions.length === 0) {
            mySubscriptionsListDiv.innerHTML = '<p>Você não está inscrito em nenhuma atividade.</p>';
            return;
        }

        subscriptions.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item'; // Reutiliza estilo
             item.dataset.id = activity.id;

             item.innerHTML = `
                <h3>${activity.title}</h3>
                <p><strong>Data:</strong> ${new Date(activity.date).toLocaleString('pt-BR')}</p>
                <p><strong>Local:</strong> ${activity.location}</p>
                <div class="activity-actions">
                     <button class="unsubscribe-button">Cancelar Inscrição</button>
                 </div>
            `;

            const cancelButton = item.querySelector('.unsubscribe-button');
            cancelButton.onclick = () => handleUnsubscribe(activity.id); // Reutiliza a função

            mySubscriptionsListDiv.appendChild(item);
        });
    }


    // --- Vinculação de Eventos ---
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    activityForm.addEventListener('submit', handleSaveActivity);


    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showView('register-view'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showView('login-view'); });

    addActivityButton.addEventListener('click', () => showActivityForm()); // Botão para mostrar form de criação
    cancelActivityFormButton.addEventListener('click', () => {
        activityForm.reset();
        showView('activities-view'); // Volta para a lista
    });


    // --- Inicialização ---
    function initializeApp() {
        if (loadUserSession()) {
            // Se tinha sessão salva, vai para atividades
            showView('activities-view');
            fetchActivities();
        } else {
            // Senão, começa na tela de login
            showView('login-view');
        }
    }

    initializeApp(); // Inicia a aplicação

}); // Fim do DOMContentLoaded