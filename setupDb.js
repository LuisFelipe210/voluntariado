// setupDb.js (coloque na raiz do projeto ou na pasta backend)
const path = require('path');
const fs = require('fs');
const rocksdb = require('rocksdb');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente do .env na pasta backend
// Ajuste o caminho se colocar o script em outro lugar
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

// Pega informações do .env
const dbPath = process.env.DB_PATH;
const adminName = process.env.DEFAULT_ADMIN_NAME;
const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

// Validação básica
if (!dbPath || !adminName || !adminEmail || !adminPassword) {
    console.error('Erro: Variáveis DB_PATH, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, e DEFAULT_ADMIN_PASSWORD devem estar definidas no arquivo .env!');
    process.exit(1);
}
if (!adminEmail.includes('@')) { // Validação super simples de email
    console.error('Erro: DEFAULT_ADMIN_EMAIL parece inválido.');
    process.exit(1);
}
// Adicionar validação de força da senha se desejar

console.log(`Iniciando setup do banco de dados em: ${dbPath}`);
console.log(`Tentando criar usuário admin: ${adminEmail}`);

// Garante que o diretório pai exista
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Diretório ${dbDir} criado.`);
    } catch (mkdirErr) {
        console.error(`Erro ao criar diretório ${dbDir}:`, mkdirErr);
        process.exit(1);
    }
}

// Abre (ou cria) o banco de dados
let db;
try {
    // Tenta abrir o banco de dados. Ele será criado se não existir.
    db = rocksdb(dbPath, { create_if_missing: true });
    db.open(async (openErr) => {
        if (openErr) {
            console.error('Erro ao abrir/criar RocksDB:', openErr);
            process.exit(1);
        }
        console.log('RocksDB aberto/criado com sucesso.');

        // Chave para o usuário admin
        const adminKey = `user:${adminEmail}`;

        // Verifica se o admin já existe
        db.get(adminKey, async (getErr, value) => {
            if (getErr && !getErr.notFound) {
                console.error('Erro ao verificar se admin existe:', getErr);
                db.close(() => process.exit(1));
                return;
            }

            if (value) {
                console.log(`Usuário admin (${adminEmail}) já existe. Nenhuma ação necessária.`);
                db.close(() => process.exit(0)); // Sai com sucesso
                return;
            }

            // Admin não existe, vamos criá-lo
            console.log(`Usuário admin (${adminEmail}) não encontrado. Criando...`);
            try {
                // Hash da senha
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

                // Dados do admin
                const adminData = {
                    id: `user_${Date.now()}_admin`, // ID único simples
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin', // Define o role como admin [cite: 6, 14]
                    createdAt: new Date().toISOString()
                };

                // Salva no RocksDB
                db.put(adminKey, JSON.stringify(adminData), (putErr) => {
                    if (putErr) {
                        console.error('Erro ao salvar usuário admin no RocksDB:', putErr);
                        db.close(() => process.exit(1));
                    } else {
                        console.log(`Usuário admin (${adminEmail}) criado com sucesso!`);
                        db.close(() => process.exit(0)); // Sucesso
                    }
                });

            } catch (hashError) {
                console.error('Erro ao gerar hash da senha:', hashError);
                db.close(() => process.exit(1));
            }
        });
    });

} catch (initError) {
    console.error('Erro fatal ao inicializar RocksDB:', initError);
    process.exit(1);
}

// Garantir que o processo não fique pendurado se algo der errado antes do db.open callback
process.on('uncaughtException', (err) => {
    console.error('Erro não capturado:', err);
    if (db && db.isOpen()) {
        db.close(() => process.exit(1));
    } else {
        process.exit(1);
    }
});