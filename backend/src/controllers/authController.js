const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db'); // Importa getDb
const { isValidEmail } = require('../utils/validationUtils');
// Carrega variáveis de ambiente
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET não está definido no arquivo .env");
  process.exit(1);
}

const loginUser = (req, res) => {
  // 1. Validar input básico
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Formato de e-mail inválido.' });

  try {
    // Pega instância do DB
    const openDb = getDb();
    const userKey = `user:${email}`;

    // 2. Buscar usuário no RocksDB
    openDb.get(userKey, async (getErr, value) => { // Mantém async para o await bcrypt
      if (getErr) {
        if (getErr.notFound) return res.status(401).json({ message: 'Credenciais inválidas (usuário não encontrado).' });
        console.error("DB Error (get user on login):", getErr);
        return res.status(500).json({ message: 'Erro ao buscar usuário.' });
      }

      let userData;
      try {
        userData = JSON.parse(value.toString());
      } catch (parseError) {
        console.error("Erro ao parsear dados do usuário do DB:", parseError, "Valor recebido:", value);
        return res.status(500).json({ message: 'Erro ao processar dados do usuário.' });
      }

      try {
        // 3. Comparar senha
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
          return res.status(401).json({ message: 'Credenciais inválidas (senha incorreta).' });
        }

        // 4. Gerar Token JWT
        const payload = { userId: userData.id, email: userData.email, role: userData.role };
        jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }, (tokenErr, token) => {
          if (tokenErr) {
            console.error('Erro ao gerar token JWT:', tokenErr);
            return res.status(500).json({ message: 'Erro ao gerar token de autenticação.' });
          }

          // 5. Retornar sucesso
          const { password: _, ...userResponseData } = userData;
          res.status(200).json({ message: 'Login bem-sucedido!', token: token, user: userResponseData });
        });

      } catch (compareOrSignError) {
        console.error("Erro durante comparação de senha ou Geração JWT:", compareOrSignError);
        return res.status(500).json({ message: 'Erro ao verificar credenciais ou gerar token.' });
      }
    }); // Fim db.get callback

  } catch (dbInstanceError) { // Catch para getDb()
      console.error("Erro ao obter instância do DB em loginUser:", dbInstanceError);
      return res.status(500).json({ message: 'Erro interno do servidor (DB não conectado).' });
  }
}; // Fim loginUser

module.exports = {
  loginUser,
};