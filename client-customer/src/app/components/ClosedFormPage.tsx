"use client";

import React from 'react';
import './ClosedFormPage.css';

interface ClosedFormPageProps {
  message: string;
}

const ClosedFormPage: React.FC<ClosedFormPageProps> = ({ message }) => {
  // Lấy thời gian hiện tại để hiển thị
  const now = new Date();
  const formattedDate = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="closed-form-container">
      <div className="closed-form-card">
        <div className="closed-form-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/>
          </svg>
        </div>
        
        <h1 className="closed-form-title">Form Đăng Ký Đã Đóng</h1>
        
        <div className="closed-form-message">
          {message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'}
        </div>
        
        <div className="closed-form-time">
          <div className="time-label">Thời gian hiện tại:</div>
          <div className="current-time">{formattedTime}</div>
          <div className="current-date">{formattedDate}</div>
        </div>
        
        <div className="closed-form-footer">
          <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ với quản trị viên.</p>
          <a href="/" className="refresh-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="refresh-icon">
              <path d="M5.463 4.433A9.961 9.961 0 0 1 12 2c5.523 0 10 4.477 10 10 0 2.136-.67 4.116-1.81 5.74L17 12h3A8 8 0 0 0 6.46 6.228l-.997-1.795zm13.074 15.134A9.961 9.961 0 0 1 12 22C6.477 22 2 17.523 2 12c0-2.136.67-4.116 1.81-5.74L7 12H4a8 8 0 0 0 13.54 5.772l.997 1.795z"/>
            </svg>
            Làm mới trang
          </a>
        </div>
      </div>
    </div>
  );
};

export default ClosedFormPage;
