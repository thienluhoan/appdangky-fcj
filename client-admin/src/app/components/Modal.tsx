"use client";

import React, { useEffect } from 'react';
import ReactModal from 'react-modal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, message, type }) => {
  // Đảm bảo app element được đặt đúng
  useEffect(() => {
    ReactModal.setAppElement(document.body);
  }, []);

  // Xác định màu sắc dựa trên loại thông báo
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'info':
      default:
        return '#2196f3';
    }
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel={title}
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        content: {
          position: 'relative',
          top: 'auto',
          left: 'auto',
          right: 'auto',
          bottom: 'auto',
          maxWidth: '500px',
          width: '90%',
          padding: '20px',
          borderRadius: '8px',
          background: '#fff',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${getTypeColor()}`
        }
      }}
    >
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ 
          margin: 0, 
          color: getTypeColor(), 
          fontSize: '20px',
          fontWeight: 600
        }}>
          {title}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          &times;
        </button>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: 0, lineHeight: '1.5' }}>{message}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: getTypeColor(),
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Đóng
        </button>
      </div>
    </ReactModal>
  );
};

export default Modal;
