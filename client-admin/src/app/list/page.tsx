"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ExportDialog from '../components/ExportDialog';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

interface Visit {
  id: string;
  name: string;
  email: string;
  phone: string;
  school: string;
  studentId?: string; // Added student ID field
  date: string;
  time?: string;
  floor?: string;
  purpose: string;
  contact: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  timestamp?: string;
}

// Style cho trang quản lý đăng ký
const globalStyle = `
  .list-page-container {
    padding-bottom: 50px;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  /* Style cho các biểu tượng sắp xếp */
  .sortable {
    cursor: pointer;
    position: relative;
    padding-right: 18px;
  }
  
  .sortable:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .sortable::after {
    content: '\u25B2';
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 8px;
    opacity: 0.3;
  }
  
  .sortable::before {
    content: '\u25BC';
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%) translateY(7px);
    font-size: 8px;
    opacity: 0.3;
  }
  
  .sort-asc::after {
    opacity: 1;
    color: #1e2e3e;
  }
  
  .sort-desc::before {
    opacity: 1;
    color: #1e2e3e;
  }
`;

export default function ListPage(): React.ReactElement {
  // Thêm style vào document khi component mount
  useEffect(() => {
    // Tạo style element
    const styleEl = document.createElement('style');
    styleEl.innerHTML = globalStyle;
    document.head.appendChild(styleEl);
    
    // Cleanup khi unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  
  // Đóng menu dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isActionMenuOpen) {
        const target = event.target as HTMLElement;
        // Kiểm tra nếu click không phải vào menu dropdown hoặc nút action
        if (!target.closest('.action-menu') && !target.closest('.action-button')) {
          setIsActionMenuOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionMenuOpen]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<string>('all'); // all, pending, approved, rejected
  const [dateFilter, setDateFilter] = useState<string>('all'); // all or a specific date
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // Store selected item IDs
  const [selectAll, setSelectAll] = useState<boolean>(false); // Track if all items are selected
  
  // State cho sắp xếp
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending' | null;
  }>({ key: '', direction: null });
  
  // Action dropdown state
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ title: '', message: '', type: 'info' });
  
  // Confirm modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => Promise.resolve());
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  
  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false);

  // Removed edit functionality as requested
  
  // Handle selecting/deselecting all items
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      // Select all visible items
      const allIds = filteredVisits.map(visit => visit.id);
      setSelectedItems(allIds);
    } else {
      // Deselect all items
      setSelectedItems([]);
    }
  };
  
  // Handle selecting/deselecting individual items
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        // Remove the item if already selected
        setSelectAll(false);
        return prev.filter(itemId => itemId !== id);
      } else {
        // Add the item if not selected
        const newSelected = [...prev, id];
        // Check if all items are now selected
        if (newSelected.length === filteredVisits.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };
  
  // Modal helper functions
  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    setModalContent({ title, message, type });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Confirm modal helper functions
  const showConfirmModal = (message: string, action: () => Promise<void>) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };
  
  // Handle batch approve
  const handleBatchApprove = async () => {
    console.log('handleBatchApprove called with items:', selectedItems);
    
    if (selectedItems.length === 0) {
      // Hiển thị thông báo lỗi bằng modal
      showModal(
        'Cảnh báo',
        'Vui lòng chọn ít nhất một đăng ký để duyệt',
        'error'
      );
      return;
    }
    
    // Tạo bản sao của selectedItems để tránh vấn đề với tham chiếu
    const itemsToApprove = [...selectedItems];
    console.log('Items to approve:', itemsToApprove);
    
    // Hiển thị hộp thoại xác nhận trước khi duyệt hàng loạt
    showConfirmModal(
      `Bạn có chắc chắn muốn duyệt ${itemsToApprove.length} đăng ký đã chọn không?`,
      async () => {
        try {
          setLoading(true);
          
          // Gọi API batch để duyệt tất cả các đăng ký cùng lúc
          // Sử dụng cookie tự động thay vì lấy token từ localStorage
          const response = await fetch('http://localhost:3000/api/visits/batch-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            // Thêm credentials: 'include' để gửi cookie tự động
            credentials: 'include',
            body: JSON.stringify({
              ids: itemsToApprove,
              status: 'approved'
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Batch approve result:', result);
            
            // Cập nhật UI
            const updatedVisits = [...visits];
            for (const id of itemsToApprove) {
              const index = updatedVisits.findIndex(visit => visit.id === id);
              if (index !== -1) {
                updatedVisits[index] = { ...updatedVisits[index], status: 'approved' };
              }
            }
            setVisits(updatedVisits);
            
            // Xóa các mục đã chọn
            setSelectedItems([]);
            setSelectAll(false);
            
            // Hiển thị thông báo kết quả
            showModal(
              'Thành công',
              `Đã duyệt thành công ${result.successCount || itemsToApprove.length} đăng ký!`,
              'success'
            );
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi duyệt đăng ký');
          }
          
          // Cập nhật lại danh sách từ server
          fetchVisits();
          
        } catch (error) {
          console.error('Error in batch approve:', error);
          showModal(
            'Lỗi',
            'Có lỗi xảy ra khi duyệt đăng ký. Vui lòng thử lại sau.',
            'error'
          );
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Handle batch reject
  const handleBatchReject = async () => {
    console.log('handleBatchReject called with items:', selectedItems);
    
    if (selectedItems.length === 0) {
      // Hiển thị thông báo lỗi bằng modal
      showModal(
        'Cảnh báo',
        'Vui lòng chọn ít nhất một đăng ký để từ chối',
        'error'
      );
      return;
    }
    
    // Tạo bản sao của selectedItems để tránh vấn đề với tham chiếu
    const itemsToReject = [...selectedItems];
    console.log('Items to reject:', itemsToReject);
    
    // Hiển thị hộp thoại xác nhận trước khi từ chối hàng loạt
    showConfirmModal(
      `Bạn có chắc chắn muốn từ chối ${itemsToReject.length} đăng ký đã chọn không?`,
      async () => {
        try {
          setLoading(true);
          
          // Gọi API batch để từ chối tất cả các đăng ký cùng lúc
          // Sử dụng cookie tự động thay vì lấy token từ localStorage
          const response = await fetch('http://localhost:3000/api/visits/batch-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            // Thêm credentials: 'include' để gửi cookie tự động
            credentials: 'include',
            body: JSON.stringify({
              ids: itemsToReject,
              status: 'rejected'
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Batch reject result:', result);
            
            // Cập nhật UI
            const updatedVisits = [...visits];
            for (const id of itemsToReject) {
              const index = updatedVisits.findIndex(visit => visit.id === id);
              if (index !== -1) {
                updatedVisits[index] = { ...updatedVisits[index], status: 'rejected' };
              }
            }
            setVisits(updatedVisits);
            
            // Xóa các mục đã chọn
            setSelectedItems([]);
            setSelectAll(false);
            
            // Hiển thị thông báo kết quả
            showModal(
              'Thành công',
              `Đã từ chối thành công ${result.successCount || itemsToReject.length} đăng ký!`,
              'success'
            );
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi từ chối đăng ký');
          }
          
          // Cập nhật lại danh sách từ server
          fetchVisits();
          
        } catch (error) {
          console.error('Error in batch reject:', error);
          showModal(
            'Lỗi',
            'Có lỗi xảy ra khi từ chối đăng ký. Vui lòng thử lại sau.',
            'error'
          );
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    console.log('handleBatchDelete called with items:', selectedItems);
    
    if (selectedItems.length === 0) {
      // Hiển thị thông báo lỗi bằng modal
      showModal(
        'Cảnh báo',
        'Vui lòng chọn ít nhất một đăng ký để xóa',
        'error'
      );
      return;
    }
    
    // Tạo bản sao của selectedItems để tránh vấn đề với tham chiếu
    const itemsToDelete = [...selectedItems];
    console.log('Items to delete:', itemsToDelete);
    
    // Hiển thị hộp thoại xác nhận trước khi xóa
    showConfirmModal(
      `Bạn có chắc chắn muốn xóa ${itemsToDelete.length} đăng ký đã chọn không?`,
      async () => {
        try {
          setLoading(true);
          
          // Gọi API batch để xóa tất cả các đăng ký cùng lúc
          const response = await fetch('http://localhost:3000/api/visits/batch-delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ids: itemsToDelete
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Batch delete result:', result);
            
            // Cập nhật UI
            const updatedVisits = visits.filter(visit => !itemsToDelete.includes(visit.id));
            setVisits(updatedVisits);
            
            // Xóa các mục đã chọn
            setSelectedItems([]);
            setSelectAll(false);
            
            // Hiển thị thông báo kết quả
            showModal(
              'Thành công',
              `Đã xóa thành công ${result.successCount || itemsToDelete.length} đăng ký!`,
              'success'
            );
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi xóa đăng ký');
          }
          
          // Cập nhật lại danh sách từ server
          fetchVisits();
          
        } catch (error) {
          console.error('Error in batch delete:', error);
          showModal(
            'Lỗi',
            'Có lỗi xảy ra khi xóa đăng ký. Vui lòng thử lại sau.',
            'error'
          );
        } finally {
          setLoading(false);
        }
      }
    );
  };
  

  
  // Xử lý xuất danh sách đã duyệt
  const handleExport = (format: 'excel' | 'markdown' | 'markdown-table' | 'html', floor?: string) => {
    // Lọc các đăng ký đã được duyệt
    let approvedVisits = visits.filter(visit => visit.status === 'approved');
    
    // Nếu có lọc theo tầng
    if (floor) {
      approvedVisits = approvedVisits.filter(visit => visit.floor === floor);
    }
    
    if (approvedVisits.length === 0) {
      const message = floor 
        ? `Không có đăng ký nào đã được duyệt ở tầng ${floor} để xuất!` 
        : 'Không có đăng ký nào đã được duyệt để xuất!';
      
      showModal('Thông báo', message, 'info');
      return;
    }
    
    // Đóng dialog xuất
    setIsExportDialogOpen(false);
    
    // Tạo header cho file
    const headers = [
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Trường đại học',
      'Mã số sinh viên',
      'Ngày đăng ký',
      'Giờ đăng ký',
      'Tầng',
      'Mục đích',
      'Người liên hệ',
      'Ghi chú',
      'Trạng thái',
      'Thời gian tạo'
    ];
    
    // Chuẩn bị dữ liệu
    const rows = approvedVisits.map(visit => [
      visit.name || '',
      visit.email || '',
      visit.phone || '',
      visit.school || '',
      visit.studentId || '',
      visit.date || '',
      visit.time || '',
      visit.floor || '',
      visit.purpose || '',
      visit.contact || '',
      visit.note || '',
      'Đã duyệt',
      visit.createdAt || ''
    ]);
    
    switch (format) {
      case 'excel':
        exportToExcel(headers, rows);
        break;
      case 'markdown':
        exportToMarkdown(headers, rows);
        break;
      case 'markdown-table':
        exportToMarkdownTable(headers, rows);
        break;
      case 'html':
        exportToHtml(headers, rows);
        break;
    }
  };
  
  // Xuất ra file Excel (.xlsx)
  const exportToExcel = (headers: string[], rows: string[][]) => {
    try {
      // Tạo workbook mới
      const wb = XLSX.utils.book_new();
      
      // Thêm dữ liệu vào worksheet, bao gồm cả headers
      const data = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Thiết lập chiều rộng cột
      const wscols = headers.map(() => ({ wch: 20 })); // Chiều rộng mặc định cho mỗi cột
      ws['!cols'] = wscols;
      
      // Thêm worksheet vào workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách đã duyệt');
      
      // Xuất file với tên có ngày hiện tại
      const fileName = `danh-sach-da-duyet-${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      // Chuyển đổi workbook thành mảng binary
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Tạo Blob từ mảng binary
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Tạo URL cho Blob
      const url = URL.createObjectURL(blob);
      
      // Tạo thẻ a để tải xuống
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      
      // Kích hoạt sự kiện click để tải xuống
      link.click();
      
      // Dọn dẹp
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Hiển thị thông báo thành công
      showModal(
        'Thành công',
        `Đã xuất file Excel thành công!`,
        'success'
      );
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      showModal(
        'Lỗi',
        'Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại sau.',
        'error'
      );
    }
  };
  
  // Xuất ra file Markdown (.md)
  const exportToMarkdown = (headers: string[], rows: string[][]) => {
    let markdownContent = `# Danh sách đăng ký đã duyệt

Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}

`;
    
    rows.forEach((row, index) => {
      markdownContent += `## ${index + 1}. ${row[0]}

`;
      
      for (let i = 0; i < headers.length; i++) {
        markdownContent += `- **${headers[i]}**: ${row[i]}
`;
      }
      
      markdownContent += '\n';
    });
    
    // Tạo Blob và tạo URL để tải xuống
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Tạo thẻ a để tải xuống
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh-sach-da-duyet-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    
    // Kích hoạt sự kiện click để tải xuống
    link.click();
    
    // Dọn dẹp
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Xuất ra file Markdown Table (.md)
  const exportToMarkdownTable = (headers: string[], rows: string[][]) => {
    let markdownContent = `# Danh sách đăng ký đã duyệt

Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}

`;
    
    // Tạo header của bảng
    markdownContent += '| ' + headers.join(' | ') + ' |\n';
    markdownContent += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    // Thêm dữ liệu vào bảng
    rows.forEach(row => {
      // Thay thế các ký tự đặc biệt trong Markdown
      const escapedRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return cell.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
      });
      
      markdownContent += '| ' + escapedRow.join(' | ') + ' |\n';
    });
    
    // Tạo Blob và tạo URL để tải xuống
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Tạo thẻ a để tải xuống
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh-sach-da-duyet-bang-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    
    // Kích hoạt sự kiện click để tải xuống
    link.click();
    
    // Dọn dẹp
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Xuất ra file HTML (.html)
  const exportToHtml = (headers: string[], rows: string[][]) => {
    let htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Danh sách đăng ký đã duyệt</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #1e2e3e; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #1e2e3e; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .export-date { color: #666; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Danh sách đăng ký đã duyệt</h1>
  <p class="export-date">Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}</p>
  
  <table>
    <thead>
      <tr>
        ${headers.map(header => `<th>${header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
`;
    
    // Thêm dữ liệu vào bảng
    rows.forEach(row => {
      htmlContent += '      <tr>\n';
      row.forEach(cell => {
        const escapedCell = cell
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\n/g, '<br>');
        
        htmlContent += `        <td>${escapedCell}</td>\n`;
      });
      htmlContent += '      </tr>\n';
    });
    
    htmlContent += `    </tbody>
  </table>
</body>
</html>`;
    
    // Tạo Blob và tạo URL để tải xuống
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Tạo thẻ a để tải xuống
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh-sach-da-duyet-${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(link);
    
    // Kích hoạt sự kiện click để tải xuống
    link.click();
    
    // Dọn dẹp
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleDelete = async (id: string) => {
    // Hiển thị hộp thoại xác nhận trước khi xóa
    showConfirmModal(
      'Bạn có chắc chắn muốn xóa đăng ký này không?',
      async () => {
        try {
          setLoading(true);
          console.log('Deleting visit with ID:', id);
          
          // Gọi API để xóa dữ liệu trên server
          const response = await fetch(`http://localhost:3000/api/visits/${id}`, {
            method: 'DELETE'
          });
          
          console.log('Delete response status:', response.status);
          
          // Xử lý kết quả thành công
          if (response.ok) {
            // Cập nhật state để xóa đăng ký khỏi UI
            setVisits(prev => prev.filter(visit => visit.id !== id));
            
            // Sử dụng toast thay vì modal để hiển thị thông báo thành công
            toast.success('Đã xóa đăng ký thành công!', {
              position: "top-right",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } else {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
          }
        } catch (error) {
          console.error('Error deleting visit:', error);
          setError('Lỗi khi xóa đăng ký: ' + (error instanceof Error ? error.message : 'Không xác định'));
          
          // Sử dụng toast.error thay vì modal để hiển thị thông báo lỗi
          toast.error('Lỗi khi xóa đăng ký: ' + (error instanceof Error ? error.message : 'Không xác định'), {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const fetchVisits = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/visits');
      const data = await response.json();
      
      const processedData = data.map((visit: any) => ({
        ...visit,
        school: visit.school || 'Chưa có thông tin',
        studentId: visit.studentId || 'Chưa có thông tin',
        floor: visit.floor || (visit.department ? visit.department.replace('Tầng ', '') : '4'),
        time: visit.time || '9:00',
        contact: visit.contact || 'Chưa có thông tin'
      }));
      
      setVisits(processedData);
      setError('');
    } catch (error) {
      console.error('Error fetching visits:', error);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    fetchVisits();
    
    // Khởi tạo kết nối socket.io
    const socketInstance = io('http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      extraHeaders: {
        'Access-Control-Allow-Origin': 'http://localhost:3002'
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Lưu socket vào state để sử dụng trong các hàm khác
    setSocket(socketInstance);
    
    // Xử lý sự kiện kết nối thành công
    socketInstance.on('connect', () => {
      console.log('Kết nối socket.io thành công, ID:', socketInstance.id);
    });
    
    // Xử lý sự kiện lỗi kết nối
    socketInstance.on('connect_error', (error) => {
      console.error('Lỗi kết nối socket.io:', error);
    });
    
    // Xử lý sự kiện đăng ký mới
    socketInstance.on('new-registration', (newVisit) => {
      console.log('Nhận đăng ký mới:', newVisit);
      setVisits(prev => {
        const updated = [newVisit, ...prev];
        return updated;
      });
    });
    
    // Xử lý sự kiện cập nhật đăng ký
    socketInstance.on('update-registration', (updatedVisit) => {
      console.log('Cập nhật đăng ký:', updatedVisit);
      setVisits(prev => {
        const updated = prev.map(visit => 
          visit.id === updatedVisit.id ? updatedVisit : visit
        );
        return updated;
      });
    });
    
    // Xử lý sự kiện cập nhật đăng ký (tên khác)
    socketInstance.on('visitUpdated', (updatedVisit) => {
      console.log('Cập nhật đăng ký (visitUpdated):', updatedVisit);
      
      // Nếu đăng ký bị từ chối và có thông tin về tầng, tăng số lượng chỗ trống
      if (updatedVisit.status === 'rejected' && updatedVisit.floorInfo) {
        console.log(`Đăng ký bị từ chối, tăng số lượng chỗ trống cho tầng ${updatedVisit.floorInfo}`);
        // Không xóa đăng ký, chỉ cập nhật trạng thái
      }
      
      setVisits(prev => {
        const updated = prev.map(visit => 
          visit.id === updatedVisit.id ? updatedVisit : visit
        );
        return updated;
      });
    });
    
    // Xử lý sự kiện xóa đăng ký
    socketInstance.on('delete-registration', (deletedId) => {
      console.log('Xóa đăng ký:', deletedId);
      setVisits(prev => {
        const updated = prev.filter(visit => visit.id !== deletedId);
        return updated;
      });
    });
    
    // Xử lý kết quả duyệt đăng ký
    socketInstance.on('approveVisitResult', (result) => {
      console.log('Kết quả duyệt đăng ký:', result);
      if (result.success && result.visit && result.visit.id) {
        // Cập nhật UI
        setVisits(prev => prev.map(visit => 
          visit.id === result.visit.id ? result.visit : visit
        ));
      } else if (result.success) {
        console.error('Không tìm thấy thông tin đăng ký trong kết quả duyệt:', result);
        // Refresh lại danh sách để đồng bộ với server
        fetchVisits();
      } else {
        setError(`Lỗi khi duyệt đăng ký: ${result.error || 'Không xác định'}`);
      }
    });
    
    // Xử lý kết quả từ chối đăng ký
    socketInstance.on('rejectVisitResult', (result) => {
      console.log('Kết quả từ chối đăng ký:', result);
      if (result.success && result.visit && result.visit.id) {
        // Cập nhật UI
        setVisits(prev => prev.map(visit => 
          visit.id === result.visit.id ? result.visit : visit
        ));
      } else if (result.success) {
        console.error('Không tìm thấy thông tin đăng ký trong kết quả từ chối:', result);
        // Refresh lại danh sách để đồng bộ với server
        fetchVisits();
      } else {
        setError(`Lỗi khi từ chối đăng ký: ${result.error || 'Không xác định'}`);
      }
    });
    
    return () => {
      socketInstance.disconnect();
    };
  }, [router]);


  // Khai báo biến socket ở cấp component để có thể sử dụng trong nhiều hàm
  const [socket, setSocket] = useState<any>(null);

  // Định nghĩa hàm formatDate trước khi sử dụng trong useMemo
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };
  
  // Hàm chuyển đổi tiếng Việt có dấu thành không dấu
  const removeVietnameseAccents = (str: string): string => {
    if (!str) return '';
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };
  
  const formatTime = (timeString?: string): string => {
    if (!timeString) return '';
    return timeString;
  };

  const updateVisitStatus = async (id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> => {
    // Xác định hành động và thông báo xác nhận
    const action = status === 'approved' ? 'duyệt' : 'từ chối';
    const confirmMessage = `Bạn có chắc chắn muốn ${action} đăng ký này không?`;
    
    // Hiển thị hộp thoại xác nhận trước khi thực hiện hành động
    showConfirmModal(
      confirmMessage,
      async () => {
        try {
          setLoading(true);
          console.log('Updating visit status via socket.io:', id, status);
          
          if (!socket) {
            throw new Error('Socket connection not established');
          }
          
          // Sử dụng socket.io để gửi yêu cầu cập nhật trạng thái
          if (status === 'approved') {
            console.log('Gửi yêu cầu duyệt đăng ký với ID:', id);
            socket.emit('approveVisit', { id: id });
          } else if (status === 'rejected') {
            console.log('Gửi yêu cầu từ chối đăng ký với ID:', id);
            socket.emit('rejectVisit', { id: id });
          }
          
          // Cập nhật UI ngay lập tức để phản hồi nhanh cho người dùng
          setVisits(prev => prev.map(visit => 
            visit.id === id ? { ...visit, status } : visit
          ));
          
          // Hiển thị thông báo thành công bằng modal thay vì alert
          const foundVisit = visits.find(visit => visit.id === id);
          showModal(
            'Thành công', 
            `Đã ${action} đăng ký thành công! ${foundVisit ? `Email thông báo đã được gửi đến ${foundVisit.email}` : ''}`,
            'success'
          );
        } catch (err) {
          console.error('Error updating visit status:', err);
          setError(`Lỗi khi cập nhật trạng thái: ${err instanceof Error ? err.message : 'Không xác định'}`);
          // Hiển thị lỗi bằng modal
          showModal(
            'Lỗi', 
            `Lỗi khi cập nhật trạng thái: ${err instanceof Error ? err.message : 'Không xác định'}`,
            'error'
          );
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Get unique dates from visits for the date filter - using createdAt instead of date
  const uniqueDates = React.useMemo(() => {
    const dates = new Set<string>();
    
    visits.forEach(visit => {
      // Luôn sử dụng createdAt (thời gian submit) thay vì date (ngày đăng ký)
      const formattedDate = formatDate(visit.createdAt);
      dates.add(formattedDate);
    });
    
    return Array.from(dates).sort((a, b) => {
      // Sort dates in descending order (newest first)
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  }, [visits]);
  
  // Lấy danh sách các tầng có sẵn
  const availableFloors = React.useMemo(() => {
    const floors = new Set<string>();
    
    visits.forEach(visit => {
      if (visit.floor) {
        floors.add(visit.floor);
      }
    });
    
    return Array.from(floors).sort();
  }, [visits]);
  
  // Thiết lập mặc định hiển thị ngày hiện tại khi component mounts
  useEffect(() => {
    // Lấy ngày hiện tại theo định dạng dd/mm/yyyy
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const formattedToday = today.toLocaleDateString('vi-VN', options);
    
    // Kiểm tra xem có dữ liệu cho ngày hiện tại không
    if (visits.length > 0) {
      const hasDataForToday = visits.some(visit => {
        const visitDate = formatDate(visit.createdAt);
        return visitDate === formattedToday;
      });
      
      // Nếu có dữ liệu cho ngày hiện tại, thiết lập filter là ngày hiện tại
      // Nếu không, hiển thị tất cả
      setDateFilter(hasDataForToday ? formattedToday : 'all');
    }
  }, [visits]);
  
  // Hàm xử lý sắp xếp
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' | null = 'ascending';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        direction = null; // Bỏ sắp xếp
      }
    }
    
    setSortConfig({ key, direction });
  };
  
  // Hàm lấy class cho tiêu đề cột
  const getHeaderSortClass = (key: string) => {
    if (sortConfig.key !== key) {
      return 'sortable';
    }
    
    if (sortConfig.direction === null) {
      return 'sortable';
    }
    
    return sortConfig.direction === 'ascending' ? 'sortable sort-asc' : 'sortable sort-desc';
  };

  // Lọc danh sách
  // Lọc danh sách
  let filteredVisits = visits.filter(visit => {
    // Filter by status
    if (filter !== 'all' && visit.status !== filter) return false;
    
    // Filter by date - using createdAt (submission date) instead of date (registered date)
    if (dateFilter !== 'all') {
      const visitDate = formatDate(visit.createdAt);
      if (visitDate !== dateFilter) return false;
    }
    
    // Filter by search term - tìm kiếm đa dạng và hỗ trợ tiếng Việt không dấu
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const termNoAccents = removeVietnameseAccents(term.toLowerCase());
      
      // Tìm kiếm trong các trường khác nhau
      const nameMatch = visit.name.toLowerCase().includes(term) || 
                       removeVietnameseAccents(visit.name.toLowerCase()).includes(termNoAccents);
      const phoneMatch = visit.phone.toLowerCase().includes(term);
      const emailMatch = visit.email.toLowerCase().includes(term);
      const schoolMatch = visit.school.toLowerCase().includes(term) || 
                         removeVietnameseAccents(visit.school.toLowerCase()).includes(termNoAccents);
      const studentIdMatch = visit.studentId?.toLowerCase().includes(term) || false;
      const floorMatch = visit.floor?.toLowerCase().includes(term) || false;
      const purposeMatch = visit.purpose.toLowerCase().includes(term) || 
                          removeVietnameseAccents(visit.purpose.toLowerCase()).includes(termNoAccents);
      const contactMatch = visit.contact.toLowerCase().includes(term) || 
                          removeVietnameseAccents(visit.contact.toLowerCase()).includes(termNoAccents);
      
      return nameMatch || phoneMatch || emailMatch || schoolMatch || studentIdMatch || 
             floorMatch || purposeMatch || contactMatch;
    }
    
    return true;
  });
  
  // Áp dụng sắp xếp nếu có
  if (sortConfig.key && sortConfig.direction) {
    filteredVisits.sort((a, b) => {
      // Lấy giá trị cần so sánh dựa trên key
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'school':
          aValue = a.school || '';
          bValue = b.school || '';
          break;
        case 'studentId':
          aValue = a.studentId || '';
          bValue = b.studentId || '';
          break;
        case 'floor':
          aValue = a.floor || '';
          bValue = b.floor || '';
          break;
        case 'date':
          // Chuyển đổi ngày thành đối tượng Date để so sánh
          aValue = new Date(a.date.split('/').reverse().join('-'));
          bValue = new Date(b.date.split('/').reverse().join('-'));
          break;
        case 'contact':
          aValue = a.contact || '';
          bValue = b.contact || '';
          break;
        case 'purpose':
          aValue = a.purpose || '';
          bValue = b.purpose || '';
          break;
        default:
          aValue = a[sortConfig.key as keyof Visit] || '';
          bValue = b[sortConfig.key as keyof Visit] || '';
      }
      
      // So sánh giá trị
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }

  return (
    <>
      {/* Modal component cho thông báo */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalContent.title}
        message={modalContent.message}
        type={modalContent.type}
      />
      
      {/* Confirm Modal component cho xác nhận */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmAction}
        message={confirmMessage}
      />
      
      {/* Global styles for the entire application */}
      <style jsx global>{`
        .list-page-container {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: 50px;
        }
        /* Fixed header table styles */
        .table-container {
          width: 100%;
          max-width: 100%;
          position: relative;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
          background-color: white;
          margin-bottom: 30px;
          overflow: hidden;
        }
        
        .table-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: #232f3e; /* AWS Blue */
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .scrollable-container {
          display: block;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 65vh;
          width: 100%;
        }
        
        .fixed-header-table thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background-color: #232f3e;
        }
        
        .fixed-header-table {
          width: 100%;
          min-width: 2000px;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        .fixed-header-table th {
          padding: 15px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          color: white; /* White text for better contrast */
          background-color: #232f3e; /* AWS Blue */
          border-bottom: 1px solid #1a2533;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: middle;
        }
        .fixed-header-table tbody tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid #eaeaea;
        }
        
        .fixed-header-table tbody tr:hover {
          background-color: #f5f9ff !important;
        }
        
        .fixed-header-table td {
          padding: 15px;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 0; /* Ensures text-overflow works properly */
          text-align: center;
          vertical-align: middle;
        }
        .fixed-header-table th.center,
        .fixed-header-table td.center {
          text-align: center;
        }
        
        /* Action buttons styling */
        .action-button {
          background-color: transparent;
          border: none;
          cursor: pointer;
          padding: 5px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 4px;
        }
        
        .action-button:hover {
          background-color: rgba(0,0,0,0.05);
        }
        
        .action-button.approve {
          color: green;
        }
        
        .action-button.reject {
          color: #dc3545;
        }
        
        .action-button.delete {
          color: #dc3545;
        }
        
        .status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          margin-right: 5px;
        }
        
        .status-badge.approved {
          color: green;
          background-color: #e6f4ea;
        }
        
        .status-badge.rejected {
          color: #dc3545;
          background-color: #f8d7da;
        }
        /* Column width definitions */
        .fixed-header-table th:nth-child(1), .fixed-header-table td:nth-child(1) { width: 12%; } /* Họ tên */
        .fixed-header-table th:nth-child(2), .fixed-header-table td:nth-child(2) { width: 8%; } /* Số điện thoại */
        .fixed-header-table th:nth-child(3), .fixed-header-table td:nth-child(3) { width: 15%; } /* Email */
        .fixed-header-table th:nth-child(4), .fixed-header-table td:nth-child(4) { width: 15%; } /* Trường */
        .fixed-header-table th:nth-child(5), .fixed-header-table td:nth-child(5) { width: 5%; } /* Tầng */
        .fixed-header-table th:nth-child(6), .fixed-header-table td:nth-child(6) { width: 8%; } /* Ngày đăng ký */
        .fixed-header-table th:nth-child(7), .fixed-header-table td:nth-child(7) { width: 5%; } /* Giờ */
        .fixed-header-table th:nth-child(8), .fixed-header-table td:nth-child(8) { width: 10%; } /* Người liên hệ */
        .fixed-header-table th:nth-child(9), .fixed-header-table td:nth-child(9) { width: 10%; } /* Mục đích */
        .fixed-header-table th:nth-child(10), .fixed-header-table td:nth-child(10) { width: 12%; } /* Thao tác */
      `}</style>
      
      <div className="list-page-container" style={{ 
        padding: '20px', 
        width: '95%', 
        maxWidth: '1600px', 
        margin: '0 auto', 
        boxSizing: 'border-box', 
        color: '#333',
        backgroundColor: '#f5f5f5',
        height: 'auto',
        minHeight: 'calc(100vh - 80px)',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        marginBottom: '40px' /* Add margin at the bottom */
      }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e2e3e' }}>Danh sách đăng ký</h1>
      
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button 
            onClick={() => setError('')} 
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#721c24',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 5px',
              fontWeight: 'bold'
            }}
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Search box */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            position: 'relative', 
            flex: 1,
            marginRight: '15px'
          }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, số điện thoại, email, trường, tầng, mục đích..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                paddingLeft: '40px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                color: '#333',
                fontSize: '14px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
            />
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '16px'
            }}>🔍</span>
          </div>
          <button 
            style={{ 
              padding: '10px 15px', 
              backgroundColor: '#1e2e3e', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              minWidth: '120px',
              height: '40px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#FF9900';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#1e2e3e';
            }}
            onClick={() => {
              // Use the current search term to filter
            }}
          >
            Tìm kiếm
          </button>
        </div>
      </div>
      
      {/* Filter buttons */}
      <div style={{ 
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          {/* Status filter buttons */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              style={{ 
                padding: '8px 15px', 
                backgroundColor: filter === 'all' ? '#FF9900' : '#1e2e3e', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',

              }}
              onMouseOver={(e) => {
                if (filter !== 'all') {
                  e.currentTarget.style.backgroundColor = '#FF9900';
                }
              }}
              onMouseOut={(e) => {
                if (filter !== 'all') {
                  e.currentTarget.style.backgroundColor = '#1e2e3e';
                }
              }}
              onClick={() => setFilter('all')}
            >
              Tất cả
            </button>
            <button 
              style={{ 
                padding: '8px 15px', 
                backgroundColor: filter === 'pending' ? '#FF9900' : '#1e2e3e',
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                if (filter !== 'pending') {
                  e.currentTarget.style.backgroundColor = '#FF9900';
                }
              }}
              onMouseOut={(e) => {
                if (filter !== 'pending') {
                  e.currentTarget.style.backgroundColor = '#1e2e3e';
                }
              }}
              onClick={() => setFilter('pending')}
            >
              Chờ duyệt
            </button>
            <button 
              style={{ 
                padding: '8px 15px', 
                backgroundColor: filter === 'approved' ? '#FF9900' : '#1e2e3e', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                if (filter !== 'approved') {
                  e.currentTarget.style.backgroundColor = '#FF9900';
                }
              }}
              onMouseOut={(e) => {
                if (filter !== 'approved') {
                  e.currentTarget.style.backgroundColor = '#1e2e3e';
                }
              }}
              onClick={() => setFilter('approved')}
            >
              Đã duyệt
            </button>
            <button 
              style={{ 
                padding: '8px 15px', 
                backgroundColor: filter === 'rejected' ? '#FF9900' : '#1e2e3e', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minWidth: '120px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                if (filter !== 'rejected') {
                  e.currentTarget.style.backgroundColor = '#FF9900';
                }
              }}
              onMouseOut={(e) => {
                if (filter !== 'rejected') {
                  e.currentTarget.style.backgroundColor = '#1e2e3e';
                }
              }}
              onClick={() => setFilter('rejected')}
            >
              Từ chối
            </button>
          </div>
          
          {/* Date filter and refresh button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center'
            }}>
              <label 
                htmlFor="dateFilter" 
                style={{ 
                  marginRight: '8px', 
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}
              >
                Lọc theo ngày:
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  id="dateFilter"
                  value={dateFilter === 'all' ? '' : dateFilter.split('/').reverse().join('-')}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Convert YYYY-MM-DD to DD/MM/YYYY format for filtering
                      const date = new Date(e.target.value);
                      const formattedDate = formatDate(date.toISOString());
                      setDateFilter(formattedDate);
                    } else {
                      setDateFilter('all');
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    color: '#333',
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '150px',
                    height: '40px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                />
                {dateFilter !== 'all' && (
                  <button
                    onClick={() => setDateFilter('all')}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#1e2e3e',
                      marginLeft: '5px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px'
                    }}
                    title="Xóa bộ lọc"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            
            <div style={{ position: 'relative', marginRight: '10px' }}>
              <button 
                className="action-button"
                style={{ 
                  padding: '8px 15px', 
                  backgroundColor: selectedItems.length > 0 ? '#1e2e3e' : '#e0e0e0', 
                  color: selectedItems.length > 0 ? 'white' : '#888', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: '0.3s',
                  minWidth: '150px',
                  height: '40px',
                  boxShadow: selectedItems.length > 0 ? '0 2px 4px rgba(30, 46, 62, 0.3)' : 'none',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  if (selectedItems.length > 0) {
                    e.currentTarget.style.backgroundColor = '#162536';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(30, 46, 62, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedItems.length > 0) {
                    e.currentTarget.style.backgroundColor = '#1e2e3e';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(30, 46, 62, 0.3)';
                  }
                }}
                onClick={() => {
                  if (selectedItems.length > 0) {
                    setIsActionMenuOpen(!isActionMenuOpen);
                  }
                }}
                disabled={selectedItems.length === 0}
                title={selectedItems.length === 0 ? 'Chọn ít nhất một đăng ký để thực hiện hành động' : `Thực hiện hành động với ${selectedItems.length} đăng ký đã chọn`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                Action ({selectedItems.length})
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {isActionMenuOpen && selectedItems.length > 0 && (
                <div 
                  className="action-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    zIndex: 1000,
                    marginTop: '5px',
                    width: '200px'
                  }}>
                  <div 
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      console.log('Approving items:', selectedItems);
                      handleBatchApprove();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                    Duyệt đã chọn
                  </div>
                  
                  <div 
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      console.log('Rejecting items:', selectedItems);
                      handleBatchReject();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Từ chối đã chọn
                  </div>
                  
                  <div 
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsActionMenuOpen(false);
                      console.log('Deleting items:', selectedItems);
                      handleBatchDelete();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Xóa đã chọn
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setIsExportDialogOpen(true)}
                style={{ 
                  padding: '8px 15px', 
                  backgroundColor: '#1e2e3e',
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF9900';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#1e2e3e';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Xuất danh sách đã duyệt
              </button>
              
              <button 
                onClick={() => {
                  fetchVisits();
                  setDateFilter('all');
                  setFilter('all');
                  setSearchTerm('');
                }}
                style={{ 
                  padding: '8px 15px', 
                  backgroundColor: '#1e2e3e',
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF9900';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#1e2e3e';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#333',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #ddd',
          marginTop: '20px',
          fontSize: '16px'
        }}>
          Đang tải dữ liệu...
        </div>
      ) : filteredVisits.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          fontSize: '16px', 
          color: '#666'
        }}>
          Không có dữ liệu đăng ký nào.
        </div>
      ) : (
        <div className="table-container">
          <div className="scrollable-container">
            <table className="fixed-header-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead className="table-header">
                <tr>
                  <th style={{ width: '3%' }} className="center">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectAll}
                        onChange={handleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', margin: '0 auto' }}
                        id="select-all-checkbox"
                      />
                      <label htmlFor="select-all-checkbox" style={{ fontSize: '10px', marginTop: '3px', color: '#fff', cursor: 'pointer' }}></label>
                    </div>
                  </th>
                  <th style={{ width: '3%' }} className="center">
                    STT
                  </th>
                  <th 
                    style={{ width: '10%' }} 
                    className={getHeaderSortClass('name')}
                    onClick={() => requestSort('name')}
                  >
                    Họ tên
                  </th>
                  <th 
                    style={{ width: '5%' }} 
                    className={getHeaderSortClass('phone')}
                    onClick={() => requestSort('phone')}
                  >
                    Số điện thoại
                  </th>
                  <th 
                    style={{ width: '12%' }} 
                    className={getHeaderSortClass('email')}
                    onClick={() => requestSort('email')}
                  >
                    Email
                  </th>
                  <th 
                    className={`school ${getHeaderSortClass('school')}`} 
                    style={{ width: '10%' }}
                    onClick={() => requestSort('school')}
                  >
                    Trường
                  </th>
                  <th 
                    style={{ width: '8%' }} 
                    className={getHeaderSortClass('studentId')}
                    onClick={() => requestSort('studentId')}
                  >
                    MSSV
                  </th>
                  <th 
                    className={`center ${getHeaderSortClass('floor')}`} 
                    style={{ width: '3%' }}
                    onClick={() => requestSort('floor')}
                  >
                    Tầng
                  </th>
                  <th 
                    style={{ width: '8%' }} 
                    className={getHeaderSortClass('date')}
                    onClick={() => requestSort('date')}
                  >
                    Ngày đăng ký
                  </th>
                  <th 
                    style={{ width: '8%' }} 
                    className={getHeaderSortClass('contact')}
                    onClick={() => requestSort('contact')}
                  >
                    Người liên hệ
                  </th>
                  <th 
                    style={{ width: '6%' }} 
                    className={getHeaderSortClass('purpose')}
                    onClick={() => requestSort('purpose')}
                  >
                    Mục đích
                  </th>
                  <th className="center" style={{ width: '6%' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="table-body">
              {filteredVisits.map((visit, index) => (
                <tr key={visit.id} style={{ 
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9',
                  transition: 'background-color 0.3s ease'
                }}>
                  <td className="center" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(visit.id)}
                        onChange={() => handleSelectItem(visit.id)}
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          cursor: 'pointer', 
                          margin: '0 auto', 
                          display: 'block',
                          accentColor: '#FF9900',
                          boxShadow: selectedItems.includes(visit.id) ? '0 0 5px rgba(255, 153, 0, 0.5)' : 'none'
                        }}
                        id={`select-item-${visit.id}`}
                      />
                    </div>
                  </td>
                  <td className="center" style={{ fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                    {index + 1}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.name}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.phone}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>
                    {visit.email}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.school || 'Chưa có thông tin'}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.studentId || 'Chưa có thông tin'}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.floor || '4'}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{(formatTime(visit.time) || '9:00') + ' - ' + formatDate(visit.date || visit.createdAt)}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.contact || 'Chưa có thông tin'}</td>
                  <td style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', verticalAlign: 'middle', padding: '8px' }}>{visit.purpose || 'Học tập'}</td>
                  <td className="center">
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                      {visit.status === 'approved' ? (
                        <>
                          <span className="status-badge approved">Đã duyệt</span>
                          <button
                            onClick={() => handleDelete(visit.id)}
                            className="action-button delete"
                            title="Xóa"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                            </svg>
                          </button>
                        </>
                      ) : visit.status === 'rejected' ? (
                        <>
                          <span className="status-badge rejected">Từ chối</span>
                          <button
                            onClick={() => handleDelete(visit.id)}
                            className="action-button delete"
                            title="Xóa"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => updateVisitStatus(visit.id, 'approved')}
                            className="action-button approve"
                            title="Duyệt"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => updateVisitStatus(visit.id, 'rejected')}
                            className="action-button reject"
                            title="Từ chối"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(visit.id)}
                            className="action-button delete"
                            title="Xóa"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Modal */}
      <Modal 
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalContent.title}
        message={modalContent.message}
        type={modalContent.type}
      />
      
      {/* Confirm modal */}
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmAction}
        message={confirmMessage}
      />
      
      {/* Export dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        availableFloors={availableFloors}
      />
    </div>
    </>
  );
}
