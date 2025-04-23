// backend/src/database/db.js (VERSÃO CORRIGIDA COM PROMISE)
const path = require('path');
const fs = require('fs');
const rocksdb = require('rocksdb');
// Carrega .env da pasta backend (ajuste se necessário)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbPath = process.env.DB_PATH;

// Validação inicial do caminho do DB
if (!dbPath) {
    console.error("FATAL ERROR: DB_PATH não está definido no arquivo .env");
    process.exit(1);
}

// Garante que o diretório pai exista
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Diretório do banco de dados ${dbDir} criado.`);
    } catch (mkdirErr) {
        console.error(`Erro fatal ao criar diretório ${dbDir}:`, mkdirErr);
        process.exit(1);
    }
}

console.log(`Inicializando RocksDB em: ${dbPath}`);

let dbInstance = null; // Variável para guardar a instância do DB

// Função que retorna uma Promise para conectar/abrir o DB
const connectDb = () => {
    // Retorna uma Promise para que possamos usar await no server.js
    return new Promise((resolve, reject) => {
        // Se já tivermos uma instância conectada, resolve imediatamente
        if (dbInstance) {
            // console.log('DB já estava conectado.'); // Log opcional
            return resolve(dbInstance);
        }

        try {
            const options = { create_if_missing: true };
            const db = rocksdb(dbPath, options);

            db.open(err => {
                if (err) {
                    console.error('Erro ao abrir RocksDB:', err);
                    reject(err); // Rejeita a Promise em caso de erro
                } else {
                    console.log('RocksDB conectado com sucesso.');
                    dbInstance = db; // Armazena a instância conectada
                    resolve(dbInstance); // Resolve a Promise com a instância do DB
                }
            });
        } catch (initError) {
            console.error('Erro ao inicializar RocksDB (try/catch):', initError);
            reject(initError); // Rejeita a Promise se a inicialização falhar
        }
    });
};

// Função para obter a instância do DB (depois de conectar)
// A função ensureDbOpen anterior não é mais necessária com a Promise
const getDb = () => {
    if (!dbInstance) {
        // Isso não deveria acontecer se connectDb foi chamado com await
        console.error("Erro: Tentativa de obter DB antes de conectar.");
        // Poderia lançar um erro ou tentar conectar aqui, mas é melhor garantir a ordem no server.js
        throw new Error("Database not connected");
    }
    return dbInstance;
};

// Exporta a função de conexão e a função para obter a instância
module.exports = { connectDb, getDb };