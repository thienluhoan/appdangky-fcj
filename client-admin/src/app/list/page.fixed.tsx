"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  GroupedVisitsList, 
  DateFilterSelect, 
  formatDate,
  getUniqueDates,
  groupVisitsByDate
} from './GroupedVisitsList';

// Định nghĩa interface cho đối tượng Visit
interface Visit {
  id: string;
  name: string;
  email: string;
  phone: string;
  school: string;
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

// Interface cho đối tượng nhóm các đăng ký theo ngày
interface GroupedVisits {
  [date: string]: Visit[];
}

// Trang Admin
export default function AdminPage() {
  // State cho danh sách đăng ký
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // State cho bộ lọc
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // State cho socket
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // State cho người dùng đăng nhập
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Router
  const router = useRouter();
  
  // State cho form đăng nhập
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  
  // State cho thông báo
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });
  
  // Hàm hiển thị thông báo
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      show: true,
      message,
      type,
    });
    
    // Tự động ẩn thông báo sau 3 giây
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };
  
  // Hàm đăng nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setIsLoggedIn(true);
        setLoginError('');
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setLoginError(data.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      setLoginError('Đã xảy ra lỗi khi đăng nhập');
    }
  };
  
  // Hàm đăng xuất
  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('user');
  };
  
  // Hàm lấy danh sách đăng ký từ server
  const fetchVisits = async () => {
    try {
      const response = await fetch('/api/visits');
      const data = await response.json();
      
      if (response.ok) {
        setVisits(data);
      } else {
        console.error('Lỗi lấy danh sách đăng ký:', data.message);
      }
    } catch (error) {
      console.error('Lỗi kết nối server:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Hàm cập nhật trạng thái đăng ký
  const updateVisitStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/visits/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Cập nhật state
        setVisits(prevVisits =>
          prevVisits.map(visit =>
            visit.id === id ? { ...visit, status } : visit
          )
        );
        
        showNotification(
          status === 'approved'
            ? 'Đã duyệt đăng ký thành công'
            : 'Đã từ chối đăng ký',
          'success'
        );
      } else {
        showNotification(data.message || 'Cập nhật thất bại', 'error');
      }
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
      showNotification('Đã xảy ra lỗi khi cập nhật', 'error');
    }
  };
  
  // Hàm xóa đăng ký
  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đăng ký này không?')) {
      const handleEdit = (id: string) => {
        console.log('Sửa đăng ký với ID:', id);
        // Mở form sửa đăng ký
      };
      const response = await fetch(`/api/visits/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Cập nhật state
        setVisits(prevVisits => prevVisits.filter(visit => visit.id !== id));
        showNotification('Đã xóa đăng ký thành công', 'success');
      } else {
        const data = await response.json();
        showNotification(data.message || 'Xóa thất bại', 'error');
          setVisits(prevVisits => prevVisits.filter(visit => visit.id !== id));
          showNotification('Đã xóa đăng ký thành công', 'success');
        } else {
          const data = await response.json();
          showNotification(data.message || 'Xóa thất bại', 'error');
        }
      } catch (error) {
        console.error('Lỗi xóa đăng ký:', error);
        showNotification('Đã xảy ra lỗi khi xóa', 'error');
      }
    }
  };
  
  // Khởi tạo socket và lấy dữ liệu khi component mount
  useEffect(() => {
    // Kiểm tra người dùng đã đăng nhập
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Lỗi phân tích dữ liệu người dùng:', error);
        localStorage.removeItem('user');
      }
    }
    
    // Chỉ lấy dữ liệu và kết nối socket khi đã đăng nhập
    if (isLoggedIn) {
      // Lấy danh sách đăng ký
      fetchVisits();
      
      // Kết nối socket
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);
      
      // Lắng nghe sự kiện từ socket
      newSocket.on('visitCreated', (newVisit: Visit) => {
        setVisits(prevVisits => [...prevVisits, newVisit]);
        showNotification('Có đăng ký mới!', 'success');
      });
      
      newSocket.on('visitUpdated', (updatedVisit: Visit) => {
        setVisits(prevVisits =>
          prevVisits.map(visit =>
            visit.id === updatedVisit.id ? updatedVisit : visit
          )
        );
      });
      
      newSocket.on('visitDeleted', (deletedId: string) => {
        setVisits(prevVisits => prevVisits.filter(visit => visit.id !== deletedId));
      });
      
      // Đóng kết nối socket khi component unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [isLoggedIn]);
  
  // Lọc danh sách đăng ký theo trạng thái, ngày và từ khóa tìm kiếm
  const filteredVisits = visits.filter(visit => {
    // Lọc theo trạng thái
    if (filter !== 'all' && visit.status !== filter) return false;
    
    // Lọc theo ngày
    if (dateFilter !== 'all') {
      const visitDate = formatDate(visit.date || visit.createdAt);
      if (visitDate !== dateFilter) return false;
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return (
        visit.name.toLowerCase().includes(term) ||
        visit.phone.toLowerCase().includes(term)
      );
    }
    
    return true;
  });
  
  // Danh sách các ngày có đăng ký
  const availableDates = Array.from(new Set<string>(
    visits.map(visit => formatDate(visit.date || visit.createdAt))
  )).sort((a, b) => new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime());
  
  // Nếu chưa đăng nhập, hiển thị form đăng nhập
  if (!isLoggedIn) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ 
          width: '400px', 
          padding: '30px', 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            color: '#1e2e3e',
            fontSize: '24px'
          }}>
            Đăng nhập quản trị
          </h1>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="username" 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}
              >
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="password" 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}
              >
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            
            {loginError && (
              <div style={{ 
                color: '#dc3545', 
                marginBottom: '20px', 
                fontSize: '14px',
                padding: '10px',
                backgroundColor: '#f8d7da',
                borderRadius: '4px'
              }}>
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1e2e3e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2c3e50';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1e2e3e';
              }}
            >
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  // Hiển thị trang quản trị khi đã đăng nhập
  return (
    <div style={{ padding: '20px', maxWidth: '100vw', boxSizing: 'border-box' }}>
      {/* Thông báo */}
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            backgroundColor: notification.type === 'success' ? '#d4edda' : '#f8d7da',
            color: notification.type === 'success' ? '#155724' : '#721c24',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '400px'
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: notification.type === 'success' ? '#155724' : '#721c24',
              marginLeft: '15px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          margin: 0,
          color: '#1e2e3e'
        }}>
          Quản lý đăng ký tham quan
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            marginRight: '15px', 
            fontSize: '14px',
            color: '#555'
          }}>
            Xin chào, {user?.username}
          </span>
          
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 15px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#c82333';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545';
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
      
      {/* Bộ lọc và tìm kiếm */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        alignItems: 'center', 
        gap: '20px',
        marginBottom: '20px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        border: '1px solid #eaeaea'
      }}>
        <div>
          <label 
            htmlFor="filter" 
            style={{ 
              marginRight: '10px', 
              fontWeight: 'bold', 
              fontSize: '14px' 
            }}
          >
            Lọc theo trạng thái:
          </label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '150px',
              color: '#333',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
        
        <div>
          <label 
            htmlFor="search" 
            style={{ 
              marginRight: '10px', 
              fontWeight: 'bold', 
              fontSize: '14px' 
            }}
          >
            Tìm kiếm:
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại"
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              minWidth: '250px',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
            }}
          />
        </div>
        
        <DateFilterSelect 
          dates={availableDates}
          selectedDate={dateFilter}
          onChange={setDateFilter}
        />
      </div>
      
      {/* Danh sách đăng ký */}
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
          padding: '40px', 
          color: '#333',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #ddd',
          marginTop: '20px',
          fontSize: '16px'
        }}>
          Không có dữ liệu đăng ký nào.
        </div>
      ) : (
        <GroupedVisitsList 
          visits={filteredVisits}
          onApprove={updateVisitStatus}
          onReject={(id) => updateVisitStatus(id, 'rejected')}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
