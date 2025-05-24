// Script để xóa sessionStorage và làm mới trang
if (typeof window !== 'undefined') {
  // Xóa trạng thái form đã lưu trong sessionStorage
  sessionStorage.removeItem('formClosed');
  sessionStorage.removeItem('closedFormMessage');
  
  console.log('Đã xóa trạng thái form đã lưu trong sessionStorage');
  
  // Làm mới trang
  window.location.reload();
}
