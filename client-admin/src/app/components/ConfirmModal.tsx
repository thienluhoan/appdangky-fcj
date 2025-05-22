"use client";

import React, { useEffect } from 'react';
import ReactModal from 'react-modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, message }) => {
  // Đảm bảo app element được đặt đúng
  useEffect(() => {
    ReactModal.setAppElement(document.body);
  }, []);

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Xác nhận"
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
          border: '1px solid #2196f3'
        }
      }}
    >
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ 
          margin: 0, 
          color: '#2196f3', 
          fontSize: '20px',
          fontWeight: 600
        }}>
          Xác nhận
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
      <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Hủy
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={{
            padding: '8px 16px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Xác nhận
        </button>
      </div>
    </ReactModal>
  );
};

export default ConfirmModal;
