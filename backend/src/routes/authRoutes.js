// backend/src/routes/authRoutes.js (CORRETO)
const express = require('express');
const authController = require('../controllers/authController'); // Importa SÓ o authController

const router = express.Router();

// Rota POST para login de usuário
router.post('/login', authController.loginUser);

module.exports = router;