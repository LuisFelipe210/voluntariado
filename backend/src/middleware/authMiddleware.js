// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;

const protect = (req, res, next) => {
  let token;

  // Verifica se o token está no header Authorization: Bearer TOKEN
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extrai o token (remove 'Bearer ')
      token = req.headers.authorization.split(' ')[1];

      // Verifica o token usando a chave secreta
      const decoded = jwt.verify(token, JWT_SECRET);

      // Adiciona os dados do usuário decodificados (payload) ao objeto `req`
      // Assim, as rotas subsequentes podem acessar req.user.userId, req.user.role, etc.
      req.user = decoded; // Contém { userId, email, role, iat, exp }

      next(); // Passa para o próximo middleware ou rota

    } catch (error) {
      console.error('Erro na autenticação do token:', error.message);
      // Trata erros comuns de JWT
      if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: 'Token inválido. Falha na autenticação.' });
      }
      if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expirado. Faça login novamente.' });
      }
       // Outro erro
       return res.status(401).json({ message: 'Não autorizado. Problema com o token.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado. Nenhum token fornecido.' });
  }
};

// Middleware opcional para verificar se o usuário é Admin
const adminOnly = (req, res, next) => {
    // Executa após o middleware 'protect', então req.user deve existir
    if (req.user && req.user.role === 'admin') {
        next(); // Usuário é admin, continua
    } else {
        res.status(403).json({ message: 'Acesso negado. Rota exclusiva para administradores.' }); // Forbidden
    }
};


module.exports = { protect, adminOnly };