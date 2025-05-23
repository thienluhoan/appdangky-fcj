'use client';

import React from 'react';

interface ClickableLogoProps {
  src: string;
  alt: string;
  height?: string | number;
  width?: string | number;
}

const ClickableLogo: React.FC<ClickableLogoProps> = ({ 
  src, 
  alt, 
  height = '50px', 
  width = 'auto' 
}) => {
  // Hàm xử lý khi click vào logo
  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
    <img
      src={src}
      alt={alt}
      onClick={handleLogoClick}
      style={{
        height,
        width,
        objectFit: 'contain',
        verticalAlign: 'middle',
        cursor: 'pointer' // Thêm con trỏ pointer để hiển thị đây là phần tử có thể click
      }}
    />
  );
};

export default ClickableLogo;
