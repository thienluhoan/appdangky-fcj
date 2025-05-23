const prisma = require('../prisma/client');
// Model xử lý đăng ký tham quan sử dụng Prisma/database

// Hàm lấy tất cả các lượt đăng ký từ database
async function getAllVisits() {
  return await prisma.visit.findMany();
}

// Không còn sử dụng hàm lưu tất cả đăng ký từ JSON nữa

// Không còn sử dụng hàm di chuyển dữ liệu từ JSON sang Prisma nữa

module.exports = {
  getAllVisits
};
