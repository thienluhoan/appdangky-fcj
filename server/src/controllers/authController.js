const { findUserByEmail, validatePassword } = require('../models/userModel');

// POST /api/auth/login
function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }
    
    const user = findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Email không tồn tại' });
    }
    
    const isValidPassword = validatePassword(user, password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }
    
    // Không trả về mật khẩu
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// GET /api/auth/me
function getCurrentUser(req, res) {
  try {
    // Thông thường sẽ lấy từ token, nhưng trong demo này chúng ta giả lập
    const email = req.query.email;
    
    if (!email) {
      return res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
    }
    
    const user = findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại' });
    }
    
    // Không trả về mật khẩu
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

module.exports = {
  login,
  getCurrentUser
};
