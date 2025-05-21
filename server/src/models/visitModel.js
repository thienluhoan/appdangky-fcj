const prisma = require('../prisma/client');
const fs = require('fs');
const path = require('path');

// Giữ lại đường dẫn file JSON cũ để có thể di chuyển dữ liệu
const dataDir = path.join(__dirname, '../../data');
const dataPath = path.join(dataDir, 'visits.json');

// Hàm lấy tất cả các lượt đăng ký từ database
async function getAllVisits() {
  return await prisma.visit.findMany();
}

// Hàm lưu tất cả các lượt đăng ký vào database
// Chỉ sử dụng trong quá trình di chuyển dữ liệu từ JSON sang Prisma
async function saveAllVisits(visits) {
  // Xóa tất cả dữ liệu hiện có (chỉ sử dụng khi cần thiết)
  // await prisma.visit.deleteMany();
  
  // Thêm tất cả các lượt đăng ký vào database
  for (const visit of visits) {
    await prisma.visit.create({
      data: visit
    });
  }
}

// Hàm di chuyển dữ liệu từ JSON sang Prisma
async function migrateDataFromJsonToPrisma() {
  if (fs.existsSync(dataPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      console.log(`Đang di chuyển ${jsonData.length} bản ghi từ JSON sang Prisma...`);
      
      // Xóa tất cả dữ liệu hiện có trong database
      await prisma.visit.deleteMany();
      
      // Thêm từng bản ghi vào database
      for (const visit of jsonData) {
        await prisma.visit.create({
          data: {
            ...visit,
            // Đảm bảo id là chuỗi
            id: String(visit.id)
          }
        });
      }
      
      console.log('Di chuyển dữ liệu thành công!');
    } catch (error) {
      console.error('Lỗi khi di chuyển dữ liệu:', error);
    }
  }
}

module.exports = {
  getAllVisits,
  saveAllVisits,
  migrateDataFromJsonToPrisma,
  dataPath
};
