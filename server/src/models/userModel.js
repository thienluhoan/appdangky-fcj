const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '../../data');
const dataPath = path.join(dataDir, 'users.json');

// Đảm bảo file dữ liệu tồn tại
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dataPath)) {
  // Tạo tài khoản admin mặc định
  const defaultAdmin = {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    // Mật khẩu: admin123
    password: crypto.createHash('sha256').update('admin123').digest('hex'),
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(dataPath, JSON.stringify([defaultAdmin], null, 2));
}

function getAllUsers() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveAllUsers(users) {
  fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));
}

function findUserByEmail(email) {
  const users = getAllUsers();
  return users.find(user => user.email === email);
}

function validatePassword(user, password) {
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  return user.password === hashedPassword;
}

module.exports = {
  getAllUsers,
  saveAllUsers,
  findUserByEmail,
  validatePassword
};
