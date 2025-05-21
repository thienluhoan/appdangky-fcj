'use client';
import React from 'react';

export default function Logo() {
  return (
    <div 
      style={{
        marginLeft: '10px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25)',
        border: '2px solid #fff',
        background: '#1e2e3e',
        padding: '5px',
        height: '70px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.35), 0 0 10px rgba(30, 46, 62, 0.4)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.25)';
      }}
    >
      <img 
        src="/img/logo.jpg" 
        alt="Logo" 
        style={{
          height: '55px',
          width: 'auto',
          display: 'block',
          borderRadius: '4px',
          transition: 'transform 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.25)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      />
    </div>
  );
}
