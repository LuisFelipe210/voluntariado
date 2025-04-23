const { getDb } = require('../database/db'); // Importa getDb
const { validateRequiredFields } = require('../utils/validationUtils');
const { randomBytes } = require('crypto'); // Para gerar IDs únicos

// --- Funções Auxiliares (RocksDB - Usando getDb) ---

// Função para obter uma atividade pelo ID (chave)
const getActivityFromDb = (activityId, callback) => {
    try {
        const openDb = getDb();
        const activityKey = `activity:${activityId}`;
        openDb.get(activityKey, (err, value) => {
            if (err) return callback(err); // Inclui notFound
            try {
                const activityData = JSON.parse(value.toString());
                if (!Array.isArray(activityData.participants)) activityData.participants = [];
                return callback(null, activityData);
            } catch (parseError) {
                return callback(parseError);
            }
        });
    } catch (dbErr) {
        callback(dbErr); // Erro ao obter instância do DB
    }
};

// Função para salvar/atualizar uma atividade
const saveActivityToDb = (activityData, callback) => {
    try {
        const openDb = getDb();
        const activityKey = `activity:${activityData.id}`;
        if (!Array.isArray(activityData.participants)) activityData.participants = [];
        openDb.put(activityKey, JSON.stringify(activityData), callback);
     } catch (dbErr) {
        callback(dbErr); // Erro ao obter instância do DB
     }
};

// Função para deletar uma atividade
const deleteActivityFromDb = (activityId, callback) => {
    try {
        const openDb = getDb();
        const activityKey = `activity:${activityId}`;
        openDb.del(activityKey, callback);
     } catch (dbErr) {
        callback(dbErr); // Erro ao obter instância do DB
     }
};

// Função para listar todas as atividades (simplificada - pode ser ineficiente)
const getAllActivitiesFromDb = (callback) => {
    try {
        const openDb = getDb();
        const activities = [];
        const iterator = openDb.iterator({ gte: 'activity:', lt: 'activity;', keyAsBuffer: false, valueAsBuffer: false });

        const processEntry = (err, key, value) => {
            if (err) { iterator.end(() => {}); return callback(err); }
            if (key === undefined && value === undefined) { // Fim
                iterator.end((endErr) => {
                    if (endErr) return callback(endErr);
                    return callback(null, activities);
                });
                return;
            }
            try {
                const activity = JSON.parse(value);
                if (!Array.isArray(activity.participants)) activity.participants = [];
                activities.push(activity);
            } catch (parseError) {
                 console.warn(`Erro ao parsear atividade com chave ${key}:`, parseError);
            }
            iterator.next(processEntry); // Próximo
        };
        iterator.next(processEntry); // Inicia
     } catch (dbErr) {
        callback(dbErr); // Erro ao obter instância do DB
     }
};

// Busca atividades em que um usuário específico está inscrito (EXPORTADA)
exports.findActivitiesByUserSubscription = (userId, callback) => {
    // Reutiliza getAllActivitiesFromDb que agora usa getDb() internamente
    getAllActivitiesFromDb((err, allActivities) => {
        if (err) {
            console.error(`Erro interno em getAllActivitiesFromDb chamado por findActivitiesByUserSubscription para user ${userId}:`, err);
            return callback(err); // Repassa erro
        }
        const subscribedActivities = allActivities.filter(activity =>
            activity.participants && activity.participants.includes(userId)
        );
        return callback(null, subscribedActivities);
    });
};


// --- Controller Functions (EXPORTADAS) ---

// Criar Atividade (Admin)
exports.createActivity = (req, res) => {
    const requiredFields = ['title', 'description', 'date', 'location', 'maxParticipants'];
    const missingFields = validateRequiredFields(req.body, requiredFields);
    if (missingFields.length > 0) return res.status(400).json({ message: `Campos faltando: ${missingFields.join(', ')}` });

    const { title, description, date, location, maxParticipants } = req.body;
    const maxParticipantsNum = parseInt(maxParticipants, 10);

    if (isNaN(maxParticipantsNum) || maxParticipantsNum < 1) return res.status(400).json({ message: 'Número máximo de participantes deve ser um número positivo.' });
    if (isNaN(new Date(date).getTime())) return res.status(400).json({ message: 'Formato de data inválido.' });

    const newActivity = {
        id: `act_${randomBytes(8).toString('hex')}`, title, description,
        date: new Date(date).toISOString(), location, maxParticipants: maxParticipantsNum,
        participants: [], createdAt: new Date().toISOString()
    };

    // Usa a função auxiliar que já usa getDb()
    saveActivityToDb(newActivity, (err) => {
        if (err) {
            console.error("Erro ao salvar nova atividade:", err);
            return res.status(500).json({ message: 'Erro interno ao criar atividade.' });
        }
        res.status(201).json({ message: 'Atividade criada com sucesso!', activity: newActivity });
    });
};

// Listar Todas as Atividades (Autenticado)
exports.getAllActivities = (req, res) => {
    // Usa a função auxiliar que já usa getDb()
    getAllActivitiesFromDb((err, activities) => {
        if (err) {
            console.error("Erro ao listar atividades:", err);
            return res.status(500).json({ message: 'Erro interno ao buscar atividades.' });
        }
        res.status(200).json({ activities });
    });
};

// Obter Atividade por ID (Autenticado)
exports.getActivityById = (req, res) => {
    const activityId = req.params.id;
    // Usa a função auxiliar que já usa getDb()
    getActivityFromDb(activityId, (err, activityData) => {
        if (err) {
            if (err.notFound) return res.status(404).json({ message: 'Atividade não encontrada.' });
            console.error(`Erro ao buscar atividade ${activityId}:`, err);
            return res.status(500).json({ message: 'Erro interno ao buscar atividade.' });
        }
        res.status(200).json({ activity: activityData });
    });
};

// Atualizar Atividade (Admin)
exports.updateActivity = (req, res) => {
    const activityId = req.params.id;

    // Usa a função auxiliar que já usa getDb()
    getActivityFromDb(activityId, (err, existingActivity) => {
        if (err) {
            if (err.notFound) return res.status(404).json({ message: 'Atividade não encontrada para atualizar.' });
            console.error(`Erro ao buscar atividade ${activityId} para update:`, err);
            return res.status(500).json({ message: 'Erro interno ao buscar atividade para atualização.' });
        }

        const requiredFields = ['title', 'description', 'date', 'location', 'maxParticipants'];
        const missingFields = validateRequiredFields(req.body, requiredFields);
        if (missingFields.length > 0) return res.status(400).json({ message: `Campos faltando para atualização: ${missingFields.join(', ')}` });

        const { title, description, date, location, maxParticipants } = req.body;
        const maxParticipantsNum = parseInt(maxParticipants, 10);

        if (isNaN(maxParticipantsNum) || maxParticipantsNum < 1) return res.status(400).json({ message: 'Número máximo de participantes deve ser um número positivo.' });
        if (isNaN(new Date(date).getTime())) return res.status(400).json({ message: 'Formato de data inválido.' });
        if (maxParticipantsNum < existingActivity.participants.length) {
            return res.status(400).json({ message: `Não é possível definir o máximo de participantes (${maxParticipantsNum}) abaixo do número atual de inscritos (${existingActivity.participants.length}).` });
        }

        const updatedActivity = {
            ...existingActivity, title, description, date: new Date(date).toISOString(),
            location, maxParticipants: maxParticipantsNum, updatedAt: new Date().toISOString()
        };

        // Usa a função auxiliar que já usa getDb()
        saveActivityToDb(updatedActivity, (saveErr) => {
            if (saveErr) {
                console.error(`Erro ao atualizar atividade ${activityId}:`, saveErr);
                return res.status(500).json({ message: 'Erro interno ao atualizar atividade.' });
            }
            res.status(200).json({ message: 'Atividade atualizada com sucesso!', activity: updatedActivity });
        });
    });
};

// Deletar Atividade (Admin)
exports.deleteActivity = (req, res) => {
    const activityId = req.params.id;

    // Verifica existência antes (usa função auxiliar com getDb)
     getActivityFromDb(activityId, (getErr, existingActivity) => {
         if (getErr && !getErr.notFound) {
             console.error(`Erro ao verificar atividade ${activityId} para delete:`, getErr);
             return res.status(500).json({ message: 'Erro ao verificar atividade antes de deletar.' });
         }
         if (getErr && getErr.notFound) {
            return res.status(404).json({ message: 'Atividade não encontrada para deletar.' });
         }

        // Tenta deletar (usa função auxiliar com getDb)
         deleteActivityFromDb(activityId, (delErr) => {
             if (delErr) {
                 console.error(`Erro ao deletar atividade ${activityId}:`, delErr);
                 return res.status(500).json({ message: 'Erro interno ao deletar atividade.' });
             }
             res.status(200).json({ message: 'Atividade excluída com sucesso!' });
         });
    });
};


// Inscrever Usuário (Usuário Comum)
exports.subscribeActivity = (req, res) => {
    const activityId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'comum') return res.status(403).json({ message: 'Apenas usuários comuns podem se inscrever em atividades.'});

    // Usa a função auxiliar que já usa getDb()
    getActivityFromDb(activityId, (err, activityData) => {
        if (err) {
            if (err.notFound) return res.status(404).json({ message: 'Atividade não encontrada para inscrição.' });
            console.error(`Erro ao buscar atividade ${activityId} para subscribe:`, err);
            return res.status(500).json({ message: 'Erro interno ao buscar atividade.' });
        }

        if (activityData.participants.includes(userId)) return res.status(409).json({ message: 'Você já está inscrito nesta atividade.' });
        if (activityData.participants.length >= activityData.maxParticipants) return res.status(400).json({ message: 'Não há mais vagas disponíveis para esta atividade.' });
        if (new Date(activityData.date) < new Date()) return res.status(400).json({ message: 'Esta atividade já ocorreu.' });

        activityData.participants.push(userId);

        // Usa a função auxiliar que já usa getDb()
        saveActivityToDb(activityData, (saveErr) => {
             if (saveErr) {
                console.error(`Erro ao salvar inscrição na atividade ${activityId}:`, saveErr);
                return res.status(500).json({ message: 'Erro interno ao registrar inscrição.' });
            }
            res.status(200).json({ message: 'Inscrição realizada com sucesso!' });
        });
    });
};


// Cancelar Inscrição (Usuário Comum)
exports.unsubscribeActivity = (req, res) => {
    const activityId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'comum') return res.status(403).json({ message: 'Ação não permitida para seu tipo de usuário.'});

    // Usa a função auxiliar que já usa getDb()
    getActivityFromDb(activityId, (err, activityData) => {
        if (err) {
            if (err.notFound) return res.status(404).json({ message: 'Atividade não encontrada para cancelar inscrição.' });
            console.error(`Erro ao buscar atividade ${activityId} para unsubscribe:`, err);
            return res.status(500).json({ message: 'Erro interno ao buscar atividade.' });
        }

        const participantIndex = activityData.participants.indexOf(userId);
        if (participantIndex === -1) return res.status(400).json({ message: 'Você não está inscrito nesta atividade.' });
        if (new Date(activityData.date) < new Date()) return res.status(400).json({ message: 'Não é possível cancelar a inscrição após o início da atividade.' });

        activityData.participants.splice(participantIndex, 1);

        // Usa a função auxiliar que já usa getDb()
        saveActivityToDb(activityData, (saveErr) => {
             if (saveErr) {
                console.error(`Erro ao salvar cancelamento na atividade ${activityId}:`, saveErr);
                return res.status(500).json({ message: 'Erro interno ao cancelar inscrição.' });
            }
            res.status(200).json({ message: 'Inscrição cancelada com sucesso!' });
        });
    });
};