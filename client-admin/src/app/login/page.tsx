"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
        localStorage.setItem('adminLoggedIn', 'true')
        router.push('/')
        setTimeout(() => {
          window.location.reload()
        }, 200);
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
      minHeight: '80vh', 
      backgroundColor: '#f5f5f5', 
      display: 'flex', 
      alignItems: 'flex-start', 
      justifyContent: 'center', 
      padding: '80px 20px 0'
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
              fontWeight: '600', 
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(30, 46, 62, 0.3)',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#2c3e50';
              if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
              if (!loading) e.currentTarget.style.boxShadow = '0 4px 8px rgba(30, 46, 62, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#1e2e3e';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(30, 46, 62, 0.3)';
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
