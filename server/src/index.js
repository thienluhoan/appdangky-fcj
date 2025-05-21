const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

// Import routes và models
const apiRoutes = require('./routes/index');
const { migrateDataFromJsonToPrisma } = require('./models/visitModel');
const { migrateConfigFromJsonToPrisma } = require('./models/formConfigModel');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Thiết lập port
const PORT = 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Xuất io cho các module khác sử dụng
global.io = io;

// Lưu trữ đối tượng io trong app để các route có thể truy cập
app.set('io', io);

// Middleware để xử lý socket.io trong controller
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Sử dụng routes
app.use('/api', apiRoutes);

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client kết nối:', socket.id);

  // Xử lý sự kiện duyệt đăng ký
  socket.on('approveVisit', async (visitId) => {
    try {
      // Đảm bảo visitId là string
      let id = visitId;
      if (typeof visitId === 'object' && visitId !== null) {
        id = visitId.id || '';
      }
      
      console.log('Nhận yêu cầu duyệt đăng ký:', { id });
      
      if (!id) {
        console.error('ID đăng ký không hợp lệ:', visitId);
        socket.emit('approveVisitResult', { success: false, error: 'ID đăng ký không hợp lệ' });
        return;
      }
      
      // Sử dụng Prisma để tìm và cập nhật đăng ký
      const visit = await prisma.visit.findUnique({
        where: { id }
      });
      
      if (visit) {
        console.log(`Đã tìm thấy đăng ký với ID: ${visitId}, cập nhật trạng thái thành 'approved'`);
        
        console.log('Cập nhật đăng ký với ID:', id);
        const updatedVisit = await prisma.visit.update({
          where: { id },
          data: {
            status: 'approved'
            // Không sử dụng updatedAt vì không có trong schema
          }
        });
        
        // Gửi email thông báo
        try {
          const { sendApprovalEmail } = require('./emailService');
          
          // Sử dụng dịch vụ email qua Gmail
          console.log('Gửi email thông báo duyệt...');
          const result = await sendApprovalEmail(updatedVisit);
          
          if (result) {
            console.log('Đã gửi email thông báo duyệt đến:', updatedVisit.email);
          } else {
            console.error('Lỗi khi gửi email thông báo duyệt');
          }
        } catch (emailError) {
          console.error('Lỗi khi gửi email duyệt:', emailError);
        }
        
        // Thông báo cho tất cả client
        io.emit('visitUpdated', updatedVisit);
        io.emit('update-registration', updatedVisit); // Để tương thích với các client cũ
        socket.emit('approveVisitResult', { success: true, visit: updatedVisit });
      } else {
        console.error(`Không tìm thấy đăng ký với ID: ${visitId}`);
        socket.emit('approveVisitResult', { success: false, error: 'Không tìm thấy đăng ký' });
      }
    } catch (error) {
      console.error('Lỗi khi duyệt đăng ký:', error);
      socket.emit('approveVisitResult', { success: false, error: 'Lỗi server' });
    }
  });

  // Xử lý sự kiện từ chối đăng ký
  socket.on('rejectVisit', async (visitId) => {
    try {
      // Đảm bảo visitId là string
      let id = visitId;
      if (typeof visitId === 'object' && visitId !== null) {
        id = visitId.id || '';
      }
      
      console.log('Nhận yêu cầu từ chối đăng ký:', { id });
      
      if (!id) {
        console.error('ID đăng ký không hợp lệ:', visitId);
        socket.emit('rejectVisitResult', { success: false, error: 'ID đăng ký không hợp lệ' });
        return;
      }
      
      // Sử dụng Prisma để tìm và cập nhật đăng ký
      const visit = await prisma.visit.findUnique({
        where: { id }
      });
      
      if (visit) {
        console.log(`Đã tìm thấy đăng ký với ID: ${visitId}, cập nhật trạng thái thành 'rejected'`);
        
        // Lưu lại thông tin tầng của đăng ký này để tăng số lượng chỗ trống
        const floorInfo = visit.floor;
        
        const updatedVisit = await prisma.visit.update({
          where: { id },
          data: {
            status: 'rejected'
            // Không sử dụng updatedAt vì không có trong schema
          }
        });
        
        // Thêm thông tin về tầng vào kết quả để client có thể xử lý
        updatedVisit.floorInfo = floorInfo;
        
        // Gửi email thông báo
        try {
          const { sendRejectionEmail } = require('./emailService');
          
          // Sử dụng dịch vụ email qua Gmail
          console.log('Gửi email thông báo từ chối...');
          const result = await sendRejectionEmail(updatedVisit);
          
          if (result) {
            console.log('Đã gửi email thông báo từ chối đến:', updatedVisit.email);
          } else {
            console.error('Lỗi khi gửi email thông báo từ chối');
          }
        } catch (emailError) {
          console.error('Lỗi khi gửi email từ chối:', emailError);
        }
        
        // Thông báo cho tất cả client
        io.emit('visitUpdated', updatedVisit);
        io.emit('update-registration', updatedVisit); // Để tương thích với các client cũ
        socket.emit('rejectVisitResult', { success: true, visit: updatedVisit });
      } else {
        console.error(`Không tìm thấy đăng ký với ID: ${visitId}`);
        socket.emit('rejectVisitResult', { success: false, error: 'Không tìm thấy đăng ký' });
      }
    } catch (error) {
      console.error('Lỗi khi từ chối đăng ký:', error);
      socket.emit('rejectVisitResult', { success: false, error: 'Lỗi server' });
    }
  });

  // Xử lý sự kiện ngắt kết nối
  socket.on('disconnect', () => {
    console.log('Client ngắt kết nối:', socket.id);
  });
});

// Hàm khởi động server
async function startServer() {
  try {
    // Chạy migration từ JSON sang Prisma nếu cần
    await migrateDataFromJsonToPrisma();
    await migrateConfigFromJsonToPrisma();
    
    // Khởi động server
    server.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Lỗi khi khởi động server:', error);
    process.exit(1);
  }
}

// Khởi động server
startServer();
