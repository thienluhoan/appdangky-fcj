import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Logo from './components/Logo';
import FormStatusChecker from './components/FormStatusChecker';
import ClickableLogo from './components/ClickableLogo';

export const metadata: Metadata = {
  title: 'Đăng Ký Văn Phòng',
  description: 'Hệ thống đăng ký lên văn phòng',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  // Xử lý lỗi cz-shortcut-listen
  const bodyProps = { suppressHydrationWarning: true };
  return (
    <html lang="vi">
      <body {...bodyProps}>
        <header style={{ 
          background: '#1e2e3e',
          color: 'white',
          padding: '0',
          width: '100%',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <ClickableLogo
              src="/img/FCJ-logo.png"
              alt="First Cloud Journey Logo"
              height="50px"
              width="auto"
            />
          </div>
        </header>
        <div style={{ paddingTop: '70px' }}>
          <main className="container">
            <FormStatusChecker>
              {children}
            </FormStatusChecker>
          </main>
        </div>
      </body>
    </html>
  );
}
