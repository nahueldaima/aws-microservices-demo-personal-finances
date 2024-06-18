const crypto = require('crypto');

const generateSalt = () => crypto.randomBytes(16).toString('hex');

const hashPassword = (password, salt) => {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString('hex');
  return hash;
}

const comparePasswords = (hashedPwd, password) => {
  let [original, salt] = hashedPwd.split('.');
  let hashedReceivedPassword = hashPassword(password, salt);
  return original === hashedReceivedPassword;
}

module.exports = {
  generateSalt,
  hashPassword,
  comparePasswords
}
