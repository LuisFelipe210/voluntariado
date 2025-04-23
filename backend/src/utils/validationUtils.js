// backend/src/utils/validationUtils.js

// Valida formato de e-mail (simples)
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    // Regex simples para formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Valida força da senha (exemplo simples)
  const isStrongPassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    // Mínimo de 8 caracteres, pelo menos uma letra e um número
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
    // Poderia adicionar mais regras: maiúscula, minúscula, caractere especial
  };
  
  // Valida campos obrigatórios de um objeto
  const validateRequiredFields = (obj, requiredFields) => {
    const missingFields = [];
    requiredFields.forEach(field => {
      if (!(field in obj) || obj[field] === null || obj[field] === undefined || obj[field] === '') {
        missingFields.push(field);
      }
    });
    return missingFields; // Retorna array de campos faltando
  };
  
  
  module.exports = {
    isValidEmail,
    isStrongPassword,
    validateRequiredFields,
  };