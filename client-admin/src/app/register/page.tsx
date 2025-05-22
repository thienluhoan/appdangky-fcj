"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [needsInitialSetup, setNeedsInitialSetup] = useState<boolean>(true);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);
  
  // Kiểm tra xem đã có admin nào chưa
  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const res = await fetch('/api/check-initial-setup');
        const data = await res.json();
        
        if (data.success) {
          setNeedsInitialSetup(data.needsInitialSetup);
          
          // Nếu không cần thiết lập ban đầu (đã có admin), chuyển hướng về trang đăng nhập
          if (!data.needsInitialSetup) {
            router.push('/login');
          }
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra cài đặt ban đầu:', err);
      } finally {
        setCheckingSetup(false);
      }
    };
    
    checkInitialSetup();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Kiểm tra mật khẩu khớp nhau
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });
  
      const data = await res.json();
  
      if (data.success) {
        setSuccess('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
        // Xóa form sau khi đăng ký thành công
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // Chuyển hướng đến trang đăng nhập sau 2 giây
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi mạng hoặc bên server');
    } finally {
      setLoading(false);
    }
  };
  
  // Hiển thị thông báo đang kiểm tra
  if (checkingSetup) {
    return (
      <div style={{ 
        minHeight: '80vh', 
        backgroundColor: '#f5f5f5', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>Đang kiểm tra...</div>
          <div style={{ width: '40px', height: '40px', margin: '0 auto', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 2s linear infinite' }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  // Hiển thị thông báo không thể đăng ký nếu đã có admin
  if (!needsInitialSetup) {
    return (
      <div style={{ 
        minHeight: '80vh', 
        backgroundColor: '#f5f5f5', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <div style={{ 
          maxWidth: '450px', 
          width: '100%', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', 
          padding: '30px', 
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 20px', 
            backgroundColor: '#d93025', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(217, 48, 37, 0.3)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e2e3e', marginBottom: '20px' }}>
            Không thể đăng ký
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
            Tài khoản admin đã được tạo. Bạn không thể đăng ký thêm tài khoản mới.
          </p>
          <Link href="/login" style={{ 
            display: 'inline-block',
            backgroundColor: '#1e2e3e',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'background-color 0.3s ease'
          }}>
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      minHeight: '80vh', 
      backgroundColor: '#f5f5f5', 
      display: 'flex', 
      alignItems: 'flex-start', 
      justifyContent: 'center', 
      padding: '80px 20px 0'
    }}>
      <div style={{ 
        maxWidth: '450px', 
        width: '100%', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', 
        padding: '30px', 
        border: '1px solid #eaeaea'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 20px', 
            backgroundColor: '#1e2e3e', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(30, 46, 62, 0.3)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1e2e3e', 
            marginBottom: '10px' 
          }}>
            Đăng ký tài khoản
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '20px' 
          }}>
            Tạo tài khoản quản trị viên mới
          </p>
        </div>
        
        {error && (
          <div style={{ 
            backgroundColor: '#fce8e6', 
            color: '#d93025', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '20px', 
            fontSize: '14px' 
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            backgroundColor: '#e6f4ea', 
            color: '#137333', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '20px', 
            fontSize: '14px' 
          }}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="username" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#333' 
            }}>
              Tên đăng nhập
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '4px', 
                border: '1px solid #ddd', 
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              placeholder="Nhập tên đăng nhập"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#333' 
            }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '4px', 
                border: '1px solid #ddd', 
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              placeholder="Nhập địa chỉ email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#333' 
            }}>
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '4px', 
                border: '1px solid #ddd', 
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label htmlFor="confirmPassword" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#333' 
            }}>
              Xác nhận mật khẩu
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '4px', 
                border: '1px solid #ddd', 
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#1e2e3e', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontSize: '16px', 
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>

          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center', 
            fontSize: '14px', 
            color: '#666' 
          }}>
            Đã có tài khoản?{' '}
            <Link href="/login" style={{ 
              color: '#1e2e3e', 
              textDecoration: 'none', 
              fontWeight: '500' 
            }}>
              Đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
