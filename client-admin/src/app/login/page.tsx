"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [needsInitialSetup, setNeedsInitialSetup] = useState<boolean>(false);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);
  
  // Kiểm tra xem đã có người dùng nào trong hệ thống chưa
  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        // Thêm tham số cache: 'no-store' để đảm bảo luôn lấy dữ liệu mới nhất
        const res = await fetch('/api/check-initial-setup', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const data = await res.json();
        
        // Chỉ hiển thị thông báo đăng ký nếu chưa có admin nào
        if (data.success) {
          console.log('Initial setup check result:', data.needsInitialSetup);
          setNeedsInitialSetup(data.needsInitialSetup);
        } else {
          // Nếu có lỗi, đặt mặc định là false để không hiển thị nút đăng ký
          setNeedsInitialSetup(false);
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra cài đặt ban đầu:', err);
        // Nếu có lỗi, đặt mặc định là false để không hiển thị nút đăng ký
        setNeedsInitialSetup(false);
      } finally {
        setCheckingSetup(false);
      }
    };
    
    checkInitialSetup();
  }, []);

  // const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError('');
    
  //   // Thông tin đăng nhập đơn giản
  //   if (username === 'admin' && password === 'admin123321') {
  //     try {
  //       // Đặt cookie và localStorage
  //       document.cookie = 'isLoggedIn=true; path=/; max-age=86400';
  //       localStorage.setItem('adminLoggedIn', 'true');
  //       // Sử dụng router.push thay vì window.location.href
  //       router.push('/');
  //     } catch (error) {
  //       console.error('Lỗi khi chuyển hướng:', error);
  //       setError('Có lỗi xảy ra, vui lòng thử lại');
  //       setLoading(false);
  //     }
  //   } else {
  //     setError('Tên đăng nhập hoặc mật khẩu không đúng');
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
  
      const data = await res.json();
  
      if (data.success) {
        localStorage.setItem('adminLoggedIn', 'true');
        
        // Lưu thông tin người dùng vào localStorage nếu có
        if (data.user) {
          const userData = {
            username: data.user.username || 'Admin',
            email: data.user.email || ''
          };
          localStorage.setItem('userData', JSON.stringify(userData));
        }
        
        // Sử dụng window.location.href thay vì router.push để đảm bảo chuyển hướng hoàn toàn
        // và tránh vấn đề với client-side routing của Next.js
        window.location.href = '/';
      } else {
        setError(data.error || 'Đăng nhập thất bại')
        setLoading(false)
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi mạng hoặc bên server');
      setLoading(false);
    }
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '0 20px'
    }}>
      <div style={{ 
        maxWidth: '400px', 
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1e2e3e', 
            marginBottom: '10px' 
          }}>
            Đăng nhập quản trị
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '20px' 
          }}>
            Vui lòng đăng nhập để quản lý đăng ký lên văn phòng
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div style={{ marginBottom: '30px' }}>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
          
          {needsInitialSetup && (
            <div style={{ 
              marginTop: '20px', 
              textAlign: 'center', 
              fontSize: '14px', 
              color: '#666' 
            }}>
              <span style={{ display: 'block', marginBottom: '5px' }}>
                Chưa có tài khoản nào trong hệ thống.
              </span>
              <Link href="/register" style={{ 
                display: 'inline-block',
                backgroundColor: '#1e2e3e',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'background-color 0.3s ease'
              }}>
                Đăng ký tài khoản admin
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
