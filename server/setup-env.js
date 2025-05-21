const fs = require('fs');
const path = require('path');

// Đường dẫn đến file .env.example và .env
const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

// Kiểm tra xem file .env đã tồn tại chưa
if (!fs.existsSync(envPath)) {
  // Nếu chưa tồn tại, sao chép từ .env.example
  fs.copyFileSync(envExamplePath, envPath);
  console.log('Đã tạo file .env từ .env.example');
} else {
  console.log('File .env đã tồn tại');
}

// Đọc nội dung file .env
const envContent = fs.readFileSync(envPath, 'utf8');

// Kiểm tra xem biến MIGRATE_DATA đã tồn tại trong file .env chưa
if (!envContent.includes('MIGRATE_DATA')) {
  // Nếu chưa tồn tại, thêm vào file .env
  const newEnvContent = envContent + '\n# Set to \'true\' to migrate data from JSON to PostgreSQL (only run once)\nMIGRATE_DATA="false"\n';
  fs.writeFileSync(envPath, newEnvContent);
  console.log('Đã thêm biến MIGRATE_DATA vào file .env');
}

console.log('Thiết lập môi trường hoàn tất!');
console.log('Để di chuyển dữ liệu từ JSON sang PostgreSQL, hãy đặt MIGRATE_DATA="true" trong file .env');
