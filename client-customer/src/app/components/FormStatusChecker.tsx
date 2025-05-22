"use client";

import React, { useState, useEffect } from 'react';
import ClosedFormPage from './ClosedFormPage';

interface FormStatusCheckerProps {
  children: React.ReactNode;
}

const FormStatusChecker: React.FC<FormStatusCheckerProps> = ({ children }) => {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const checkFormStatus = async () => {
    try {
      const response = await fetch('/api/form-status');
      if (response.ok) {
        const data = await response.json();
        setIsFormOpen(data.isOpen);
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái form:', error);
      // Trong trường hợp lỗi, mặc định cho phép truy cập
      setIsFormOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Kiểm tra ngay khi component được tải
    checkFormStatus();
    
    // Thiết lập kiểm tra định kỳ mỗi 30 giây
    const intervalId = setInterval(checkFormStatus, 30000);
    
    // Dọn dẹp interval khi component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!isFormOpen) {
    return <ClosedFormPage message={message} />;
  }

  return <>{children}</>;
};

export default FormStatusChecker;
