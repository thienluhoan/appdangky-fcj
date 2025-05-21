const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Đường dẫn đến file .env
const envPath = path.join(__dirname, '.env');

// Kiểm tra xem file .env đã tồn tại chưa
if (!fs.existsSync(envPath)) {
  console.log('File .env không tồn tại. Đang chạy setup-env.js...');
  require('./setup-env');
}

console.log('Đang chạy Prisma migration...');

// Chạy Prisma migration
exec('npx prisma migrate deploy', (error, stdout, stderr) => {
  if (error) {
    console.error(`Lỗi khi chạy migration: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
  }
  
  console.log(`Migration stdout: ${stdout}`);
  console.log('Migration hoàn tất. Đang khởi động server...');
  
  // Khởi động server
  exec('node src/index.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Lỗi khi khởi động server: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Server stderr: ${stderr}`);
    }
    
    console.log(`Server stdout: ${stdout}`);
  });
});
