/**
 * Middleware xác thực người dùng
 * Kiểm tra token trong header Authorization hoặc cookie
 */
const isAuthenticated = (req, res, next) => {
  try {
    // Kiểm tra token trong header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        // Trong môi trường phát triển, chấp nhận mọi token
        return next();
      }
    }
    
    // Kiểm tra cookie
    if (req.cookies && (req.cookies.adminToken || req.cookies.isLoggedIn === 'true')) {
      return next();
    }
    
    // Nếu không có token hoặc cookie, trả về lỗi 401
    return res.status(401).json({ message: 'Không có quyền truy cập' });
  } catch (error) {
    console.error('Lỗi xác thực:', error);
    return res.status(401).json({ message: 'Lỗi xác thực' });
  }
};

module.exports = {
  isAuthenticated
};
