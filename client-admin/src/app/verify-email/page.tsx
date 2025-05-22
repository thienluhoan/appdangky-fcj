"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Đang xác thực email của bạn...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token xác thực không hợp lệ.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage('Email đã được xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Xác thực email thất bại. Token không hợp lệ hoặc đã hết hạn.');
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
        setMessage('Có lỗi xảy ra khi xác thực email. Vui lòng thử lại sau.');
      }
    };

    verifyEmail();
  }, [token]);

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
        border: '1px solid #eaeaea',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 20px', 
            backgroundColor: status === 'success' ? '#137333' : (status === 'error' ? '#d93025' : '#1e2e3e'), 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(30, 46, 62, 0.3)'
          }}>
            {status === 'loading' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            )}
            {status === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            )}
            {status === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1e2e3e', 
            marginBottom: '10px' 
          }}>
            {status === 'loading' ? 'Đang xác thực email' : 
             status === 'success' ? 'Xác thực thành công' : 'Xác thực thất bại'}
          </h2>
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '20px' 
          }}>
            {message}
          </p>
        </div>

        {status !== 'loading' && (
          <div>
            <Link href="/login">
              <button style={{ 
                padding: '12px 24px', 
                backgroundColor: '#1e2e3e', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '16px', 
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                {status === 'success' ? 'Đăng nhập ngay' : 'Quay lại đăng nhập'}
              </button>
            </Link>
            
            {status === 'error' && (
              <div style={{ marginTop: '20px' }}>
                <Link href="/register" style={{ 
                  color: '#1e2e3e', 
                  textDecoration: 'none', 
                  fontWeight: '500',
                  fontSize: '14px'
                }}>
                  Đăng ký lại
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
