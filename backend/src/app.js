// backend/src/app.js
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

// Importa Rotas
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityRoutes'); // ****** AGORA IMPORTA DE VERDADE ******

// Importa Middlewares
const { protect } = require('./middleware/authMiddleware'); // Só precisamos do protect aqui globalmente

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Middlewares Globais
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas Públicas
app.use('/api/users', userRoutes); // Registro
app.use('/api/auth', authRoutes);   // Login
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// --- Rotas Protegidas ---
// Aplica o middleware 'protect' a TODAS as rotas definidas em activityRoutes
// As verificações específicas de Admin ('adminOnly') são feitas DENTRO de activityRoutes.js
app.use('/api/activities', protect, activityRoutes); // ****** USA AS ROTAS DE ATIVIDADE ******

// Rotas de teste (remover se não precisar mais)
// app.get('/api/test-protected', protect, (req, res) => { ... });
// app.get('/api/test-admin', protect, adminOnly, (req, res) => { ... });


// Tratamento de Erros (404 e 500) - Manter no final
app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint não encontrado.' });
});
app.use((err, req, res, next) => {
  console.error('Erro inesperado:', err.stack);
  res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
});

module.exports = app;