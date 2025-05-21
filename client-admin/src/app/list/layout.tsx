import React from 'react';

export const metadata = {
  title: 'Quản lý đăng ký lên văn phòng - Danh sách',
  description: 'Trang quản lý đăng ký lên văn phòng',
};

export default function ListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="list-layout">
      {children}
    </div>
  );
}
