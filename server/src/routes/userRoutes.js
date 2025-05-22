const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');

const prisma = new PrismaClient();

// Đăng ký người dùng mới
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.username === username 
          ? 'Tên đăng nhập đã tồn tại' 
          : 'Email đã được sử dụng' 
      });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isVerified: true, // Đánh dấu là đã xác thực ngay lập tức
        role: 'ADMIN' // Vai trò mặc định là ADMIN
      }
    });

    // Loại bỏ mật khẩu khỏi phản hồi
    const { password: _, ...userWithoutSensitiveInfo } = newUser;

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.',
      user: userWithoutSensitiveInfo
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký người dùng' });
  }
});

// Lấy danh sách người dùng (không yêu cầu xác thực cho admin dashboard)
router.get('/all', async (req, res) => {
  try {
    // Lấy tất cả người dùng, loại bỏ mật khẩu
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách người dùng' });
  }
});

// Lấy danh sách người dùng (yêu cầu xác thực)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Lấy tất cả người dùng, loại bỏ mật khẩu
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách người dùng' });
  }
});

// Xóa người dùng
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem người dùng có tồn tại không
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    
    // Không cho phép xóa chính mình
    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập' });
    }
    
    // Xóa người dùng
    await prisma.user.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa người dùng' });
  }
});

// Xác thực email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token xác thực không hợp lệ' });
    }

    // Tìm người dùng với token xác thực
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        isVerified: false
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token xác thực không hợp lệ hoặc đã được sử dụng' });
    }

    // Kiểm tra xem token đã hết hạn chưa
    const now = new Date();
    if (user.tokenExpiry && user.tokenExpiry < now) {
      return res.status(400).json({ success: false, message: 'Token xác thực đã hết hạn' });
    }

    // Cập nhật trạng thái xác thực của người dùng
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        tokenExpiry: null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Email đã được xác thực thành công!'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xác thực email' });
  }
});

// Kiểm tra xem đã có người dùng nào trong hệ thống chưa
router.get('/check-initial-setup', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.status(200).json({
      success: true,
      needsInitialSetup: userCount === 0
    });
  } catch (error) {
    console.error('Error checking initial setup:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra cài đặt ban đầu' });
  }
});

// Lấy thông tin người dùng hiện tại (yêu cầu đăng nhập)
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Loại bỏ mật khẩu và token khỏi phản hồi
    const { password, verificationToken, ...userWithoutSensitiveInfo } = user;

    res.status(200).json({
      success: true,
      user: userWithoutSensitiveInfo
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông tin người dùng' });
  }
});

// Cập nhật thông tin cá nhân (yêu cầu đăng nhập)
router.put('/update-profile', isAuthenticated, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    // Kiểm tra xem username hoặc email đã tồn tại chưa (ngoại trừ của chính người dùng hiện tại)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ],
        NOT: {
          id: userId
        }
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.username === username 
          ? 'Tên đăng nhập đã tồn tại' 
          : 'Email đã được sử dụng' 
      });
    }

    // Cập nhật thông tin người dùng
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        email
      }
    });

    // Loại bỏ mật khẩu và token khỏi phản hồi
    const { password, verificationToken, tokenExpiry, ...userWithoutSensitiveInfo } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: userWithoutSensitiveInfo
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật thông tin' });
  }
});

// Cập nhật mật khẩu (yêu cầu đăng nhập)
router.put('/update-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Kiểm tra dữ liệu đầu vào
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    // Lấy thông tin người dùng hiện tại
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật mật khẩu thành công'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật mật khẩu' });
  }
});

module.exports = router;
