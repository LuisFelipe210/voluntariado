// backend/src/routes/activityRoutes.js
const express = require('express');
const activityController = require('../controllers/activityController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Rotas de Atividades ---

// POST /api/activities - Criar nova atividade (Admin)
router.post('/', protect, adminOnly, activityController.createActivity);

// GET /api/activities - Listar todas as atividades disponíveis (Usuários autenticados)
router.get('/', protect, activityController.getAllActivities);

// GET /api/activities/:id - Obter detalhes de uma atividade específica (Usuários autenticados)
router.get('/:id', protect, activityController.getActivityById);

// PUT /api/activities/:id - Atualizar uma atividade existente (Admin)
router.put('/:id', protect, adminOnly, activityController.updateActivity);

// DELETE /api/activities/:id - Excluir uma atividade (Admin)
router.delete('/:id', protect, adminOnly, activityController.deleteActivity);

// --- Rotas de Inscrição ---

// POST /api/activities/:id/subscribe - Inscrever usuário na atividade (Usuário Comum)
// Nota: Idealmente, verificamos se o usuário é 'comum' no controller, pois 'protect' já garante autenticação.
router.post('/:id/subscribe', protect, activityController.subscribeActivity);

// DELETE /api/activities/:id/subscribe - Cancelar inscrição do usuário (Usuário Comum)
router.delete('/:id/subscribe', protect, activityController.unsubscribeActivity);

module.exports = router;