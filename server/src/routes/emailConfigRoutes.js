const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const { isAuthenticated } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { updateUserEmailConfig, getUserEmailConfig } = require('../emailService');

const prisma = new PrismaClient();

// Đường dẫn đến file cấu hình email
const configFilePath = path.join(__dirname, '../config/emailConfig.json');

// Hàm để đảm bảo thư mục config tồn tại
async function ensureConfigDirectoryExists() {
  const configDir = path.join(__dirname, '../config');
  try {
    await fs.access(configDir);
  } catch (error) {
    // Nếu thư mục không tồn tại, tạo mới
    await fs.mkdir(configDir, { recursive: true });
  }
}

// Hàm để đọc cấu hình email từ file
async function readEmailConfig() {
  try {
    await ensureConfigDirectoryExists();
    
    try {
      const data = await fs.readFile(configFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Nếu file không tồn tại hoặc không đọc được, trả về cấu hình mặc định
      return { email: '', password: '' };
    }
  } catch (error) {
    console.error('Error reading email config:', error);
    throw error;
  }
}

// Hàm để lưu cấu hình email vào file
async function saveEmailConfig(config) {
  try {
    await ensureConfigDirectoryExists();
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving email config:', error);
    throw error;
  }
}

// GET /api/email-config - Lấy cấu hình email của người dùng đang đăng nhập
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Lấy ID người dùng từ thông tin xác thực
    const userId = req.user.id;
    
    // Tìm cấu hình email của người dùng trong database
    const userEmailConfig = await prisma.emailConfig.findUnique({
      where: { userId }
    });
    
    if (userEmailConfig) {
      // Ẩn mật khẩu thực tế, chỉ trả về placeholder nếu đã có mật khẩu
      const response = {
        host: userEmailConfig.host || 'smtp.gmail.com',
        port: userEmailConfig.port || '587',
        secure: userEmailConfig.secure || false,
        email: userEmailConfig.email,
        password: userEmailConfig.password ? '********' : ''
      };
      
      res.json(response);
    } else {
      // Nếu người dùng chưa có cấu hình, trả về cấu hình mặc định
      const config = await readEmailConfig();
      
      // Ẩn mật khẩu thực tế, chỉ trả về placeholder nếu đã có mật khẩu
      const response = {
        host: 'smtp.gmail.com',
        port: '587',
        secure: false,
        email: config.email || '',
        password: config.password ? '********' : ''
      };
      
      res.json(response);
    }
  } catch (error) {
    console.error('Error getting email config:', error);
    res.status(500).json({ error: 'Không thể đọc cấu hình email' });
  }
});

// POST /api/email-config - Lưu cấu hình email cho người dùng đang đăng nhập
router.post('/', isAuthenticated, async (req, res) => {
  try {
    // Lấy ID người dùng từ thông tin xác thực
    const userId = req.user.id;
    
    const { host, port, secure, email, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email không được để trống' });
    }
    
    // Tìm cấu hình email hiện tại của người dùng
    const existingConfig = await prisma.emailConfig.findUnique({
      where: { userId }
    });
    
    // Nếu password là placeholder hoặc trống, giữ lại mật khẩu cũ
    let newPassword = password;
    if (existingConfig && (!password || password === '********')) {
      newPassword = existingConfig.password;
    }
    
    const newConfig = {
      host: host || 'smtp.gmail.com',
      port: port || '587',
      secure: secure || false,
      email,
      password: newPassword
    };
    
    // Cập nhật cấu hình email của người dùng
    await updateUserEmailConfig(userId, newConfig);
    
    // Trả về thành công nhưng ẩn mật khẩu
    res.json({
      host: newConfig.host,
      port: newConfig.port,
      secure: newConfig.secure,
      email: newConfig.email,
      password: newConfig.password ? '********' : '',
      message: 'Cấu hình email đã được lưu thành công'
    });
  } catch (error) {
    console.error('Error saving email config:', error);
    res.status(500).json({ error: 'Không thể lưu cấu hình email' });
  }
});

// POST /api/email-config/test - Kiểm tra kết nối email
router.post('/test', async (req, res) => {
  try {
    const { host, port, secure, email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email và mật khẩu không được để trống' });
    }
    
    if (!host || !port) {
      return res.status(400).json({ success: false, error: 'SMTP Host và Port là bắt buộc' });
    }
    
    // Tạo transporter để kiểm tra kết nối
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port),
      secure: secure,
      auth: {
        user: email,
        pass: password
      }
    });
    
    // Kiểm tra kết nối
    await transporter.verify();
    
    res.json({ success: true, message: 'Kết nối thành công' });
  } catch (error) {
    console.error('Error testing email connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Không thể kết nối đến máy chủ email. Vui lòng kiểm tra lại thông tin đăng nhập.' 
    });
  }
});

module.exports = router;
