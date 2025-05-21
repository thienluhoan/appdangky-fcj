'use client';
import React from 'react';

export default function Logo() {
  return (
    <img 
      src="/img/logo.jpg" 
      alt="Logo" 
      style={{
        marginLeft: '5px',
        height: '60px',
        width: 'auto',
        display: 'block',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
      }}
    />
  );
}