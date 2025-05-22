const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fcj-admin-secret-key';
const TOKEN_EXPIRY = '7d'; // Token hết hạn sau 7 ngày

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu' 
      });
    }
    
    // Tìm người dùng theo tên đăng nhập
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Tên đăng nhập không tồn tại' 
      });
    }
    
    // Kiểm tra trạng thái xác thực
    if (!user.isVerified) {
      return res.status(401).json({ 
        success: false, 
        error: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.' 
      });
    }
    
    // So sánh mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Mật khẩu không đúng' 
      });
    }
    
    // Tạo JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Không trả về mật khẩu và các thông tin nhạy cảm
    const { password: _, verificationToken: __, tokenExpiry: ___, ...userWithoutSensitiveInfo } = user;
    
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: userWithoutSensitiveInfo
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
}

// GET /api/auth/me
async function getCurrentUser(req, res) {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Không có token xác thực' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Xác thực token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Lấy thông tin người dùng từ database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'Không tìm thấy người dùng' 
        });
      }
      
      // Không trả về mật khẩu và các thông tin nhạy cảm
      const { password: _, verificationToken: __, tokenExpiry: ___, ...userWithoutSensitiveInfo } = user;
      
      res.json({
        success: true,
        user: userWithoutSensitiveInfo
      });
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token không hợp lệ hoặc đã hết hạn' 
      });
    }
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
}

// Kiểm tra xem đã có người dùng nào trong hệ thống chưa
async function checkInitialSetup(req, res) {
  try {
    const userCount = await prisma.user.count();
    res.status(200).json({
      success: true,
      needsInitialSetup: userCount === 0
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra cài đặt ban đầu:', error);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
}

module.exports = {
  login,
  getCurrentUser,
  checkInitialSetup
};
