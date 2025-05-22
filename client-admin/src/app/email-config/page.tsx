'use client';

import React, { useState, useEffect } from 'react';

export default function EmailConfigPage() {
  // State để lưu thông tin cấu hình email
  const [emailConfig, setEmailConfig] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    secure: false,
    email: '',
    password: ''
  });
  
  // State để hiển thị thông báo
  const [message, setMessage] = useState({
    text: '',
    type: '' // 'success' hoặc 'error'
  });
  
  // State loading
  const [loading, setLoading] = useState(false);
  
  // State hiển thị mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  
  // State kiểm tra kết nối
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Lấy cấu hình email hiện tại khi trang được tải
  useEffect(() => {
    const fetchEmailConfig = async () => {
      try {
        setLoading(true);
        
        // Lấy token xác thực từ cookie
        const token = document.cookie.split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
        
        const response = await fetch('/api/email-config', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setEmailConfig({
            host: data.host || 'smtp.gmail.com',
            port: data.port || '587',
            secure: data.secure || false,
            email: data.email || '',
            password: data.password || ''
          });
        } else {
          console.error('Không thể lấy cấu hình email');
        }
      } catch (error) {
        console.error('Lỗi khi lấy cấu hình email:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmailConfig();
  }, []);
  
  // Xử lý khi thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEmailConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Gửi cấu hình email đến server
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage({ text: '', type: '' });
      
      // Lấy token xác thực từ cookie
      const token = document.cookie.split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(emailConfig),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ text: 'Cấu hình email đã được lưu thành công', type: 'success' });
        // Cập nhật lại state với dữ liệu mới
        setEmailConfig({
          host: data.host || 'smtp.gmail.com',
          port: data.port || '587',
          secure: data.secure || false,
          email: data.email || '',
          password: data.password || ''
        });
      } else {
        setMessage({ text: data.error || 'Lỗi khi lưu cấu hình email', type: 'error' });
      }
    } catch (error) {
      console.error('Lỗi khi lưu cấu hình email:', error);
      setMessage({ text: 'Lỗi khi lưu cấu hình email', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Kiểm tra kết nối email
  const testConnection = async () => {
    try {
      setTestingConnection(true);
      setMessage({ text: '', type: '' });
      
      // Nếu mật khẩu là placeholder, không thể kiểm tra kết nối
      if (emailConfig.password === '********') {
        setMessage({ 
          text: 'Vui lòng nhập mật khẩu để kiểm tra kết nối', 
          type: 'error' 
        });
        setTestingConnection(false);
        return;
      }
      
      // Lấy token xác thực từ cookie
      const token = document.cookie.split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/email-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(emailConfig),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: 'Kết nối thành công', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Lỗi kết nối', type: 'error' });
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra kết nối:', error);
      setMessage({ text: 'Lỗi khi kiểm tra kết nối', type: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Cấu hình Email</h1>
      
      {/* Hiển thị thông báo */}
      {message.text && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Cấu hình Email</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="host" className="block text-gray-700 font-medium mb-2">Máy chủ SMTP</label>
            <input
              type="text"
              id="host"
              name="host"
              value={emailConfig.host}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="smtp.gmail.com"
            />
          </div>
          
          <div className="flex mb-4 space-x-4">
            <div className="w-1/2">
              <label htmlFor="port" className="block text-gray-700 font-medium mb-2">Cổng</label>
              <input
                type="text"
                id="port"
                name="port"
                value={emailConfig.port}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="587"
              />
            </div>
            
            <div className="w-1/2 flex items-end pb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="secure"
                  checked={emailConfig.secure}
                  onChange={handleChange}
                  className="mr-2 h-5 w-5"
                />
                <span className="text-gray-700">Kết nối bảo mật (SSL/TLS)</span>
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={emailConfig.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@gmail.com"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Mật khẩu ứng dụng</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={emailConfig.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={emailConfig.password ? "********" : "Nhập mật khẩu ứng dụng"}
              />
              <button 
                type="button" 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Nếu bạn dùng Gmail, bạn cần tạo mật khẩu ứng dụng tại <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Account</a>
            </p>
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
            
            <button
              type="button"
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              onClick={testConnection}
              disabled={testingConnection || !emailConfig.email || !emailConfig.password}
            >
              {testingConnection ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}