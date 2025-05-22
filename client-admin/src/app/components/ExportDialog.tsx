"use client";

import React from 'react';
import './dialog-styles.css';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'excel' | 'markdown' | 'markdown-table' | 'html', floor?: string) => void;
  availableFloors: string[];
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExport, availableFloors }) => {
  if (!isOpen) return null;
  
  // State để lưu tầng được chọn
  const [selectedFloor, setSelectedFloor] = React.useState<string>('all');
  
  // Xử lý click vào overlay để đóng dialog
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Chỉ đóng dialog khi click vào overlay, không phải vào nội dung dialog
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Xử lý khi chọn tầng
  const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFloor(e.target.value);
  };
  
  // Xử lý khi xuất với định dạng được chọn
  const handleExport = (format: 'excel' | 'markdown' | 'markdown-table' | 'html') => {
    onExport(format, selectedFloor !== 'all' ? selectedFloor : undefined);
  };

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog-container">
        <div className="dialog-header">
          <h2>Xuất danh sách</h2>
          <button className="dialog-close-button" onClick={onClose}>×</button>
        </div>
        <div className="dialog-content">
          <div className="export-filters">
            <div className="filter-group">
              <label htmlFor="floor-filter">Lọc theo tầng:</label>
              <select 
                id="floor-filter" 
                value={selectedFloor} 
                onChange={handleFloorChange}
                className="floor-select"
              >
                <option value="all">Tất cả các tầng</option>
                {availableFloors.map(floor => (
                  <option key={floor} value={floor}>Tầng {floor}</option>
                ))}
              </select>
            </div>
          </div>
          
          <p>Chọn định dạng xuất:</p>
          <div className="export-options">
            <button 
              className="export-option-button excel"
              onClick={() => handleExport('excel')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Excel (.xlsx)</span>
            </button>
            
            <button 
              className="export-option-button markdown"
              onClick={() => handleExport('markdown')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <line x1="9" y1="10" x2="15" y2="10"></line>
                <line x1="12" y1="7" x2="12" y2="13"></line>
              </svg>
              <span>Markdown (.md)</span>
            </button>
            
            <button 
              className="export-option-button markdown-table"
              onClick={() => handleExport('markdown-table')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <span>Markdown Table (.md)</span>
            </button>
            
            <button 
              className="export-option-button html"
              onClick={() => handleExport('html')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>HTML (.html)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
