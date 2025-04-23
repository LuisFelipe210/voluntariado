// backend/src/routes/userRoutes.js (VERIFICAR SE ESTÁ ASSIM)
const express = require('express');
const userController = require('../controllers/userController'); 
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Rotas de Usuário ---

// POST /api/users/register - Registrar novo usuário (PÚBLICA)
router.post('/register', userController.registerUser);  

// GET /api/users/me/subscriptions - Listar atividades inscritas (PROTEGIDA)
router.get('/me/subscriptions', protect, userController.getMySubscriptions);

module.exports = router;