// backend/src/server.js (VERSÃO CORRIGIDA COM ASYNC/AWAIT - VERIFIQUE SE O SEU ESTÁ IGUAL)
const app = require('./app'); // Importa a configuração do Express de app.js
const { connectDb, getDb } = require('./database/db'); // Importa a nova função connectDb e getDb

const PORT = process.env.PORT || 3000;

// Função principal assíncrona para iniciar o servidor
const startServer = async () => {
  try {
    // 1. Conecta ao Banco de Dados e espera a Promise resolver
    console.log("Tentando conectar ao banco de dados...");
    await connectDb(); // Espera a conexão ser estabelecida
    console.log("Conexão com o banco de dados estabelecida.");

    // 2. Inicia o servidor Express APÓS conectar ao DB
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse a saúde da API em http://localhost:${PORT}/api/health`);
    });

    // 3. Configura o fechamento gracioso do DB ao encerrar o servidor
    process.on('SIGINT', async () => {
      console.log("\nRecebido SIGINT (Ctrl+C). Fechando conexão com RocksDB...");
      const db = getDb(); // Pega a instância conectada
      if (db) {
          db.close((err) => {
              if (err) {
                  console.error('Erro ao fechar RocksDB:', err);
                  process.exit(1);
              } else {
                  console.log('RocksDB fechado com sucesso.');
                  process.exit(0);
              }
          });
      } else {
        process.exit(0);
      }
    });

  } catch (error) {
    console.error("Falha ao iniciar o servidor:", error);
    process.exit(1);
  }
};

// Chama a função para iniciar o servidor
startServer();