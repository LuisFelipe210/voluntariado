// backend/src/controllers/userController.js (COMPLETO COM LOGS DE DEBUG)
const bcrypt = require('bcrypt');
const { getDb } = require('../database/db'); // Importa a nova função getDb
const { isValidEmail, isStrongPassword, validateRequiredFields } = require('../utils/validationUtils');
const { findActivitiesByUserSubscription } = require('./activityController'); // Para getMySubscriptions

// --- Registrar Usuário ---
const registerUser = async (req, res) => { // Mantém async por causa do bcrypt.hash
    // Validações iniciais (iguais)
    const requiredFields = ['name', 'email', 'password', 'role'];
    const missingFields = validateRequiredFields(req.body, requiredFields);
    if (missingFields.length > 0) return res.status(400).json({ message: `Campos faltando: ${missingFields.join(', ')}` });

    const { name, email, password, role } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Formato de e-mail inválido.' });
    if (!isStrongPassword(password)) return res.status(400).json({ message: 'Senha fraca. Requer mínimo de 8 caracteres, incluindo letras e números.' });
    if (!['comum', 'admin'].includes(role)) return res.status(400).json({ message: 'Tipo de usuário inválido. Use "comum" ou "admin".' });

    try {
        const openDb = getDb();
        const userKey = `user:${email}`;

        // Verificar se o e-mail já existe no RocksDB
        openDb.get(userKey, async (getErr, value) => { // Mantém async interno pro bcrypt

            // ****** LOGS ADICIONADOS PARA DEBUG ******
            if (getErr) { // Só loga detalhes se houver erro
                console.log('--- DEBUG INÍCIO getErr ---');
                console.log('Tipo de getErr:', typeof getErr);
                console.log('getErr é instância de Error?', getErr instanceof Error);
                console.log('getErr.toString():', getErr.toString());
                console.log('String(getErr):', String(getErr));
                console.log('getErr.message:', getErr.message);
                console.log('getErr.code:', getErr.code);       // Verifica se tem propriedade 'code'
                console.log('getErr.notFound:', getErr.notFound); // Verifica a propriedade notFound
                console.log('Object.keys(getErr):', Object.keys(getErr)); // Vê outras propriedades
                 try { console.log('JSON.stringify(getErr):', JSON.stringify(getErr)); } catch(e) { console.log('JSON.stringify(getErr) falhou'); }
                console.log('--- DEBUG FIM getErr ---');
            }
            // ****** FIM DOS LOGS PARA DEBUG ******


            // Lógica de tratamento (mantém a versão anterior por enquanto)
            // CASE 1: User Found successfully
            if (!getErr && value) {
                return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
            }

            // CASE 2: Error occurred during get
            if (getErr) {
                // Check if it's the expected NotFound error
                if (String(getErr).includes('NotFound')) { // Mantém a verificação atual por enquanto
                    console.log(`INFO: Usuário (${email}) não encontrado. Prosseguindo para criação...`);
                } else {
                    // UNEXPECTED DB Error
                    console.error("DB Error (get user on register):", getErr); // Log original continua aqui
                    return res.status(500).json({ message: 'Erro inesperado ao verificar usuário existente.' });
                }
            }
            // CASE 3: No error, but no value?
            else if (!value) {
                 console.warn(`DB Warning: get para ${userKey} não retornou erro nem valor. Tratando como NotFound.`);
            }

            // --- Se chegou até aqui, significa que o usuário NÃO foi encontrado ---
            try {
                // 6. Hash da senha
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // 7. Preparar dados do usuário
                const userData = {
                    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    name, email, password: hashedPassword, role,
                    createdAt: new Date().toISOString()
                };

                // 8. Salvar no RocksDB
                openDb.put(userKey, JSON.stringify(userData), (putErr) => {
                    if (putErr) {
                        console.error("DB Error (put user on register):", putErr);
                        return res.status(500).json({ message: 'Erro ao salvar usuário no banco de dados.' });
                    }
                    // Sucesso! Retorna resposta 201
                    const { password: _, ...userResponse } = userData;
                    return res.status(201).json({ message: 'Usuário registrado com sucesso!', user: userResponse });
                }); // Fim db.put callback

            } catch (hashOrPutError) { // Captura erros do bcrypt ou do db.put
                console.error("Erro durante a criação do usuário (hash/put):", hashOrPutError);
                return res.status(500).json({ message: 'Erro ao criar usuário.' });
            }
        }); // Fim db.get callback

    } catch (dbInstanceError) { // Catch para getDb()
        console.error("Erro ao obter instância do DB em registerUser:", dbInstanceError);
        return res.status(500).json({ message: 'Erro interno do servidor (DB não conectado).' });
    }
}; // Fim registerUser


// --- Obter Minhas Inscrições (código inalterado, mas depende do findActivitiesByUserSubscription corrigido) ---
const getMySubscriptions = (req, res) => {
    const userId = req.user.userId;
    findActivitiesByUserSubscription(userId, (err, subscribedActivities) => {
        if (err) {
            // findActivitiesByUserSubscription já deve ter logado o erro interno
            return res.status(500).json({ message: 'Erro interno ao buscar suas inscrições.' });
        }
        res.status(200).json({ subscriptions: subscribedActivities });
    });
};


// Exporta as funções do controller
module.exports = {
  registerUser,
  getMySubscriptions,
};