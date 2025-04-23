# Projeto API - Atividades de Voluntariado (Desafio Módulo 09)

## Objetivo

Desenvolver uma API REST utilizando Node.js para o gerenciamento de atividades de voluntariado. A API permite que usuários (comuns e administradores) se cadastrem, façam login, visualizem atividades e registrem sua participação. Utiliza autenticação JWT para controle de acesso e RocksDB como banco de dados. O projeto inclui também um front-end simples em JavaScript puro para interação com a API.

## Funcionalidades Principais

* **Autenticação:** Cadastro e Login de usuários (comum/admin) com e-mail e senha. Autenticação baseada em Token JWT
* **Controle de Acesso:** Middleware para proteger rotas. Permissões distintas para usuários comuns e administradores.
* **Usuário Comum:**
    * Visualizar atividades disponíveis.
    * Inscrever-se em atividades (com vagas, antes do início).
    * Cancelar inscrição (antes do início).
    * Visualizar atividades em que está inscrito.
* **Administrador:**
    * Todas as permissões de usuário comum.
    * Criar, Editar e Excluir atividades.
    * (Visualizar participantes acessando detalhes da atividade).
* **Gerenciamento de Atividades:** CRUD completo para atividades (título, descrição, data, local, máx. participantes). Controle de vagas.
* **Validação:** Validação manual de dados (sem bibliotecas externas) para e-mail, senha e dados de atividades.

## Tecnologias Utilizadas

* **Back-end:**
    * Node.js 
    * Express.js
    * JSON Web Token (jsonwebtoken) 
    * RocksDB (via pacote `rocksdb` npm) 
    * bcrypt (para hash de senhas)
    * dotenv (para variáveis de ambiente)
    * cors (para Cross-Origin Resource Sharing)
* **Front-end:**
    * HTML5
    * CSS3
    * JavaScript puro (Vanilla JS)
* **Banco de Dados:**
    * RocksDB 
* **Desenvolvimento:**
    * nodemon (opcional, para desenvolvimento)
    * concurrently (opcional, para rodar back+front)
    * open-cli (opcional, para abrir front-end)

## Pré-requisitos

* Node.js (versão recomendada LTS)
* npm (geralmente instalado com o Node.js)
* Git

## Configuração do Projeto

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/LuisFelipe210/voluntariado
    cd <nome-da-pasta-do-projeto>
    ```

2.  **Instale as Dependências do Back-end:**
    ```bash
    cd backend
    npm install
    ```
    *(Nota: A instalação do `rocksdb` pode exigir ferramentas de compilação C/C++ no seu sistema)*

3.  **Configure as Variáveis de Ambiente:**
    * Renomeie ou copie o arquivo `.env.example` (se existir) para `.env` dentro da pasta `backend`.
    * Ou crie um arquivo `.env` na pasta `backend` e preencha as seguintes variáveis:
        ```env
        PORT=3000
        JWT_SECRET=SUA_CHAVE_SECRETA_MUITO_SEGURA_AQUI
        JWT_EXPIRES_IN=1h
        DB_PATH=./database/voluntariado_db

        # Credenciais para o script de setup do Admin inicial
        DEFAULT_ADMIN_NAME=Administrador
        DEFAULT_ADMIN_EMAIL=admin@example.com
        DEFAULT_ADMIN_PASSWORD=SenhaF0rte!Admin
        ```
    * **Importante:** Use uma `JWT_SECRET` forte e segura e uma senha forte para o admin padrão.

4.  **Inicialize o Banco de Dados e Crie o Admin:**
    * Certifique-se de que as credenciais do admin padrão estão no arquivo `backend/.env`.
    * Na pasta **raiz** do projeto (onde está o `setupDb.js`), rode:
        ```bash
        node setupDb.js
        ```

## Execução

1.  **Inicie o Servidor Back-end:**
    * Navegue até a pasta `backend`: `cd backend`
    * Use um dos comandos:
        * Modo normal: `npm start`
        * Modo de desenvolvimento (reinicia automaticamente com nodemon): `npm run dev`
    * *Se você configurou o `concurrently` e `open-cli` no script `start`*, ele também deve abrir o front-end no navegador.

2.  **Abra o Front-end:**
    * Se o passo anterior não abriu automaticamente, abra o arquivo `frontend/index.html` diretamente no seu navegador web.

3.  **Use a Aplicação:**
    * Registre um novo usuário comum ou faça login com o usuário admin criado (`admin@example.com` e a senha definida no `.env`).
