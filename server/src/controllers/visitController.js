const prisma = require('../prisma/client');
const { sendApprovalEmail, sendRejectionEmail } = require('../emailService');

// GET /api/visits
async function getVisits(req, res) {
  try {
    const data = await prisma.visit.findMany();
    res.json(data);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu từ database:', error);
    res.status(500).json({ error: 'Không thể đọc dữ liệu' });
  }
}

// POST /api/visits
async function createVisit(req, res) {
  try {
    const { name, email, phone, date, purpose, school, floor, time, contact, purposeDetail, studentId } = req.body;
    if (!name || !email || !phone || !date || !purpose) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
    
    // Log the request body to verify studentId is being received
    console.log('Registration data received:', req.body);
    console.log('Student ID received:', studentId);
    
    // Kiểm tra trạng thái form trước khi cho phép đăng ký
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Đường dẫn đến file cấu hình form
      const formConfigPath = path.join(__dirname, '../../data/form-config.json');
      
      // Đọc cấu hình form từ file
      const formConfig = JSON.parse(fs.readFileSync(formConfigPath, 'utf8'));
      
      // Kiểm tra trạng thái đóng form thủ công
      if (formConfig.isFormClosed) {
        console.log('Form đã bị đóng thủ công, từ chối đăng ký');
        
        // Gửi thông báo đến tất cả các client đang kết nối
        try {
          const io = req.app.get('io');
          if (io) {
            io.emit('form-status-changed', { 
              isOpen: false, 
              message: formConfig.formSchedule?.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.'
            });
            console.log('Gửi thông báo đóng form đến tất cả các client');
          }
        } catch (socketError) {
          console.error('Lỗi khi gửi thông báo Socket.IO:', socketError);
        }
        
        return res.status(403).json({
          error: formConfig.formSchedule?.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.'
        });
      }
      
      // Kiểm tra lịch trình đóng/mở form nếu có
      if (formConfig.formSchedule && formConfig.formSchedule.enabled) {
        // Kiểm tra ngày trong tuần
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
        
        // Kiểm tra xem ngày hiện tại có trong danh sách ngày mở cửa không
        if (!formConfig.formSchedule.openDays.includes(currentDay)) {
          console.log('Ngày hiện tại không nằm trong ngày mở cửa, từ chối đăng ký');
          
          // Gửi thông báo đến tất cả các client đang kết nối
          try {
            const io = req.app.get('io');
            if (io) {
              io.emit('form-status-changed', { 
                isOpen: false, 
                message: formConfig.formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
              });
              console.log('Gửi thông báo đóng form đến tất cả các client');
            }
          } catch (socketError) {
            console.error('Lỗi khi gửi thông báo Socket.IO:', socketError);
          }
          
          return res.status(403).json({
            error: formConfig.formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
          });
        }
        
        // Kiểm tra giờ mở cửa và đóng cửa
        const [openHour, openMinute] = formConfig.formSchedule.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = formConfig.formSchedule.closeTime.split(':').map(Number);
        
        // Tạo đối tượng Date cho thời gian mở cửa và đóng cửa trong ngày hiện tại
        const openTimeToday = new Date(now);
        openTimeToday.setHours(openHour, openMinute, 0, 0);
        
        const closeTimeToday = new Date(now);
        closeTimeToday.setHours(closeHour, closeMinute, 0, 0);
        
        // Kiểm tra xem thời gian hiện tại có nằm trong khoảng thời gian mở cửa không
        if (!(now >= openTimeToday && now <= closeTimeToday)) {
          console.log('Thời gian hiện tại không nằm trong khoảng thời gian mở cửa, từ chối đăng ký');
          
          // Gửi thông báo đến tất cả các client đang kết nối
          try {
            const io = req.app.get('io');
            if (io) {
              io.emit('form-status-changed', { 
                isOpen: false, 
                message: formConfig.formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
              });
              console.log('Gửi thông báo đóng form đến tất cả các client');
            }
          } catch (socketError) {
            console.error('Lỗi khi gửi thông báo Socket.IO:', socketError);
          }
          
          return res.status(403).json({
            error: formConfig.formSchedule.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
          });
        }
      }
    } catch (formCheckError) {
      console.error('Lỗi khi kiểm tra trạng thái form:', formCheckError);
      // Tiếp tục xử lý đăng ký nếu có lỗi khi kiểm tra trạng thái form
    }
    
    // Check for total daily capacity limit (55 registrations per day)
    const todayRegistrations = await prisma.visit.count({
      where: {
        date: date
      }
    });
    
    if (todayRegistrations >= 55) {
      return res.status(400).json({ 
        error: 'Đăng kí không thành công: Đã đủ số lượng đăng ký trong ngày. Vui lòng đăng ký vào ngày khác.'
      });
    }
    
    // Check for floor capacity limits
    if (floor === '46') {
      const floor46Registrations = await prisma.visit.count({
        where: {
          date: date,
          floor: '46'
        }
      });
      
      if (floor46Registrations >= 15) {
        return res.status(400).json({ 
          error: 'Đăng kí không thành công: Đã đủ số lượng đăng ký cho Tầng 46 trong ngày. Vui lòng đăng ký vào ngày khác hoặc chọn tầng khác.'
        });
      }
    } else if (floor === '26') {
      const floor26Registrations = await prisma.visit.count({
        where: {
          date: date,
          floor: '26'
        }
      });
      
      if (floor26Registrations >= 20) {
        return res.status(400).json({ 
          error: 'Đăng kí không thành công: Đã đủ số lượng đăng ký cho Tầng 26 trong ngày. Vui lòng đăng ký vào ngày khác hoặc chọn tầng khác.'
        });
      }
    } else if (floor === '25') {
      const floor25Registrations = await prisma.visit.count({
        where: {
          date: date,
          floor: '25'
        }
      });
      
      if (floor25Registrations >= 20) {
        return res.status(400).json({ 
          error: 'Đăng kí không thành công: Đã đủ số lượng đăng ký cho Tầng 25 trong ngày. Vui lòng đăng ký vào ngày khác hoặc chọn tầng khác.'
        });
      }
    }
    
    // Ensure floor is a string
    const floorValue = floor ? String(floor) : '';
    
    // Format timestamp
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds}`;
    
    // Create new visit in database
    const newVisit = await prisma.visit.create({
      data: {
        id: Date.now().toString(),
        name,
        email,
        phone,
        school,
        studentId,
        date,
        purpose,
        department: floor ? `Tầng ${floor}` : '',
        time,
        contact,
        note: purposeDetail || '',
        floor: floorValue,
        status: 'pending',
        timestamp: `${hours}:${minutes}:${seconds}`,
        createdAt: new Date()
      }
    });
    
    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('newVisit', newVisit);
    } else if (global.io) {
      global.io.emit('new-registration', newVisit);
    }
    
    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Lỗi khi tạo đăng ký:', error);
    res.status(500).json({ error: 'Không thể tạo đăng ký' });
  }
}

// PATCH /api/visits/:id
async function updateVisitStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`Đang cập nhật trạng thái đăng ký ${id} thành ${status}`);
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }
    
    // Tìm đăng ký trong database
    const visit = await prisma.visit.findUnique({
      where: { id }
    });
    
    if (!visit) {
      console.log(`Không tìm thấy đăng ký với ID: ${id}`);
      return res.status(404).json({ error: 'Đăng ký không tồn tại' });
    }
    
    // Cập nhật trạng thái đăng ký trong database
    const updatedVisit = await prisma.visit.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
    
    console.log(`Đã cập nhật trạng thái đăng ký ${id} thành ${status}`);
    
    // Emit socket.io events trước khi gửi email
    if (req.io) {
      req.io.emit('status-updated', { id, status });
    } else if (global.io) {
      console.log('Đang phát sóng sự kiện cập nhật đăng ký qua socket.io');
      global.io.emit('update-registration', updatedVisit);
      global.io.emit('visitUpdated', updatedVisit);
    }
    
    // Gửi email thông báo (không chờ kết quả)
    if ((status === 'approved' || status === 'rejected') && updatedVisit.email) {
      // Kiểm tra email hợp lệ - nhưng không dừng lại quy trình nếu không hợp lệ
      if (!updatedVisit.email.includes('@')) {
        console.log('Email không hợp lệ, nhưng vẫn tiếp tục cập nhật trạng thái:', updatedVisit.email);
      } else {
        try {
          // Gửi email trong background để không làm chậm API
          setTimeout(async () => {
            try {
              console.log(`Bắt đầu gửi email ${status === 'approved' ? 'duyệt' : 'từ chối'} đến ${updatedVisit.email}...`);
              
              // Gửi email một lần duy nhất, không cần thử lại vì emailService đã có cơ chế bỏ qua lỗi
              let emailSent = false;
              
              try {
                // Lấy ID của người dùng đang thực hiện hành động từ req.user
                const userId = req.user ? req.user.id : null;
                console.log('Người dùng gửi email:', userId);
                
                if (status === 'approved') {
                  emailSent = await sendApprovalEmail(updatedVisit, userId);
                } else {
                  emailSent = await sendRejectionEmail(updatedVisit, userId);
                }
                
                console.log(`Kết quả gửi email ${status === 'approved' ? 'duyệt' : 'từ chối'}: ${emailSent ? 'Thành công' : 'Thất bại nhưng đã bỏ qua'}`);
              } catch (err) {
                console.error(`Lỗi khi gửi email:`, err.message);
              }
            } catch (emailError) {
              console.error('Lỗi khi gửi email trong background:', emailError);
            }
          }, 100);
          
          console.log('Đã khởi tạo quá trình gửi email trong background');
        } catch (emailSetupError) {
          console.error('Lỗi khi thiết lập gửi email:', emailSetupError);
        }
      }
    }
    
    // Trả về kết quả ngay lập tức, không chờ email
    res.json({ 
      success: true, 
      message: status === 'approved' ? 'Đã duyệt đăng ký và đang gửi email thông báo' : 'Đã từ chối đăng ký và đang gửi email thông báo', 
      visit: updatedVisit 
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái:', error);
    res.status(500).json({ 
      success: false,
      error: 'Không thể cập nhật dữ liệu', 
      details: error.message 
    });
  }
}

// DELETE /api/visits/:id
async function deleteVisit(req, res) {
  try {
    const { id } = req.params;
    console.log('Deleting visit with ID:', id);
    
    // Tìm đăng ký trong database
    const visit = await prisma.visit.findUnique({
      where: { id }
    });
    
    if (!visit) {
      console.log('Visit not found with ID:', id);
      return res.status(404).json({ error: 'Đăng ký không tồn tại' });
    }
    
    // Xóa đăng ký khỏi database
    await prisma.visit.delete({
      where: { id }
    });
    
    // Emit socket.io event
    if (req.io) {
      req.io.emit('deleteVisit', id);
    } else if (global.io) {
      global.io.emit('delete-registration', id);
    }
    
    console.log('Successfully deleted visit:', visit);
    res.json({ success: true, message: 'Đã xóa đăng ký thành công', visit });
  } catch (error) {
    console.error('Lỗi khi xóa đăng ký:', error);
    res.status(500).json({ error: 'Không thể xóa dữ liệu' });
  }
}

// DELETE /api/visits/batch
async function batchDeleteVisits(req, res) {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách ID không hợp lệ' });
    }
    
    console.log('Batch deleting visits with IDs:', ids);
    
    // Tìm các đăng ký trong database
    const visits = await prisma.visit.findMany({
      where: {
        id: { in: ids }
      }
    });
    
    if (visits.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đăng ký nào' });
    }
    
    // Xóa các đăng ký khỏi database
    await prisma.visit.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    
    // Emit socket.io event
    if (req.io) {
      req.io.emit('batchDeleteVisits', ids);
    } else if (global.io) {
      global.io.emit('batch-delete-registrations', ids);
    }
    
    console.log('Successfully batch deleted visits:', visits.length);
    res.json({ success: true, message: `Đã xóa ${visits.length} đăng ký thành công`, visits });
  } catch (error) {
    console.error('Lỗi khi xóa hàng loạt đăng ký:', error);
    res.status(500).json({ error: 'Không thể xóa dữ liệu' });
  }
}

// GET /api/visits/count
async function countVisits(req, res) {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ngày để đếm' });
    }
    
    console.log('Đếm số lượt đăng ký cho ngày:', date);
    
    // Đếm số lượt đăng ký trong ngày sử dụng Prisma
    // Chỉ đếm các đăng ký có trạng thái pending hoặc approved, không đếm rejected
    const count = await prisma.visit.count({
      where: {
        date: date,
        status: {
          in: ['pending', 'approved']
        }
      }
    });
    
    console.log('Số lượt đăng ký trong ngày', date, ':', count);
    
    res.json({ count, date });
  } catch (error) {
    console.error('Lỗi khi đếm số lượt đăng ký:', error);
    res.status(500).json({ error: 'Không thể đếm số lượt đăng ký' });
  }
}

// GET /api/visits/count-floor
async function countFloorVisits(req, res) {
  try {
    const { date, floor } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ngày để đếm' });
    }
    
    if (!floor) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tầng để đếm' });
    }
    
    console.log(`Đếm số lượt đăng ký cho tầng ${floor} vào ngày ${date}`);
    
    // Đếm số lượt đăng ký cho tầng cụ thể trong ngày
    // Chỉ đếm các đăng ký có trạng thái pending hoặc approved, không đếm rejected
    const count = await prisma.visit.count({
      where: {
        date: date,
        floor: floor,
        status: {
          in: ['pending', 'approved']
        }
      }
    });
    
    console.log(`Số lượt đăng ký cho tầng ${floor} vào ngày ${date}: ${count}`);
    
    res.json({ count, date, floor });
  } catch (error) {
    console.error('Lỗi khi đếm số lượt đăng ký theo tầng:', error);
    res.status(500).json({ error: 'Không thể đếm số lượt đăng ký theo tầng' });
  }
}

// PATCH /api/visits/batch-update
async function batchUpdateVisits(req, res) {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách ID không hợp lệ' });
    }
    
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }
    
    console.log(`Batch updating visits with status: ${status} for IDs:`, ids);
    
    // Tìm các đăng ký trong database
    const visits = await prisma.visit.findMany({
      where: {
        id: { in: ids }
      }
    });
    
    if (visits.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đăng ký nào' });
    }
    
    // Cập nhật trạng thái cho các đăng ký
    const updatedVisits = await prisma.visit.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        status: status
        // Không sử dụng updatedAt vì không có trong schema
      }
    });
    
    // Emit socket.io event
    if (req.io) {
      req.io.emit('batchUpdateVisits', { ids, status });
    } else if (global.io) {
      global.io.emit('batch-update-registrations', { ids, status });
    }
    
    // Gửi email thông báo cho từng đăng ký
    if (status === 'approved' || status === 'rejected') {
      console.log(`Bắt đầu gửi email ${status === 'approved' ? 'duyệt' : 'từ chối'} cho ${visits.length} đăng ký...`);
      
      // Lấy ID của người dùng đang thực hiện hành động từ req.user
      // Lưu userId trước khi gọi setTimeout để đảm bảo nó được truyền vào closure
      const userId = req.user ? req.user.id : null;
      console.log('Người dùng gửi email batch:', userId);
      
      // Gửi email trong background để không làm chậm API
      setTimeout(async () => {
        let emailsSent = 0;
        
        for (const visit of visits) {
          if (visit.email && visit.email.includes('@')) {
            try {
              console.log(`Đang gửi email ${status === 'approved' ? 'duyệt' : 'từ chối'} đến ${visit.email}...`);
              
              let emailSent = false;
              if (status === 'approved') {
                emailSent = await sendApprovalEmail(visit, userId);
              } else {
                emailSent = await sendRejectionEmail(visit, userId);
              }
              
              if (emailSent) {
                emailsSent++;
                console.log(`Gửi email thành công đến ${visit.email}`);
              }
            } catch (err) {
              console.error(`Lỗi khi gửi email đến ${visit.email}:`, err.message);
            }
          } else {
            console.log(`Email không hợp lệ hoặc không có cho đăng ký ${visit.id}: ${visit.email || 'không có'}`);
          }
        }
        
        console.log(`Đã gửi ${emailsSent}/${visits.length} email thông báo ${status === 'approved' ? 'duyệt' : 'từ chối'} thành công`);
      }, 100);
      
      console.log('Đã khởi tạo quá trình gửi email trong background');
    }
    
    console.log('Successfully batch updated visits:', updatedVisits.count);
    res.json({ 
      success: true, 
      message: `Đã cập nhật ${updatedVisits.count} đăng ký thành công${(status === 'approved' || status === 'rejected') ? ' và đang gửi email thông báo' : ''}`, 
      successCount: updatedVisits.count 
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật hàng loạt đăng ký:', error);
    res.status(500).json({ error: 'Không thể cập nhật dữ liệu' });
  }
}

module.exports = {
  getVisits,
  createVisit,
  updateVisitStatus,
  deleteVisit,
  batchDeleteVisits,
  countVisits,
  countFloorVisits,
  batchUpdateVisits
};
