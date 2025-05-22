/**
 * Middleware xác thực người dùng
 * Kiểm tra và xác thực JWT token trong header Authorization
 */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fcj-admin-secret-key';

const isAuthenticated = async (req, res, next) => {
  try {
    // Kiểm tra token trong header Authorization hoặc cookie
    let token;
    
    // Kiểm tra trong header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // Kiểm tra trong cookie
    else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.trim().substring(6); // 'token='.length = 6
      }
    }
    
    // Nếu không có token, trả về lỗi
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không có token xác thực' 
      });
    }
    
    try {
      // Xác thực token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Kiểm tra xem người dùng có tồn tại trong database không
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Người dùng không tồn tại' 
        });
      }
      
      // Kiểm tra trạng thái xác thực
      if (!user.isVerified) {
        return res.status(401).json({ 
          success: false, 
          message: 'Tài khoản chưa được xác thực' 
        });
      }
      
      // Gán thông tin người dùng vào request để sử dụng trong các middleware tiếp theo
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc đã hết hạn' 
      });
    }
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi xác thực' 
    });
  }
};

module.exports = {
  isAuthenticated
};
