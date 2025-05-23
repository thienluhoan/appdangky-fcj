"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';

// Định nghĩa interface cho đối tượng User
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Cho phép các trường khác nếu cần
}

export default function AccountPage(): React.ReactElement {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  // Lưu trữ thông tin người dùng hiện tại để kiểm tra khi xóa
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'email-config' | 'create-account'>('profile');
  
  // Thêm state cho cấu hình email
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '',
    secure: false,
    email: '',
    password: ''
  });
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testEmailMessage, setTestEmailMessage] = useState<string>('');
  
  // State cho form tạo tài khoản mới
  const [newAccount, setNewAccount] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [createAccountLoading, setCreateAccountLoading] = useState<boolean>(false);
  
  // State cho danh sách người dùng
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Lấy cấu hình email
  const fetchEmailConfig = async () => {
    try {
      const res = await fetch('/api/email-config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await res.json();

      // API trả về dữ liệu trực tiếp, không có trường success hay config
      if (data) {
        console.log('Nhận được cấu hình email:', data);
        setEmailConfig({
          host: data.host || '',
          port: data.port || '',
          secure: data.secure || false,
          email: data.email || '',
          password: data.password || ''
        });
      }
    } catch (err) {
      console.error('Lỗi khi lấy cấu hình email:', err);
    }
  };

  useEffect(() => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    // Lấy danh sách người dùng khi tab tạo tài khoản được chọn
    if (activeTab === 'create-account') {
      fetchUsers();
    }

    // Lấy thông tin người dùng
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/account', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const data = await res.json();

        if (data.success) {
          setUser(data.user);
          setCurrentUser(data.user); // Lưu thông tin người dùng hiện tại
          setFormData(prev => ({
            ...prev,
            username: data.user.username,
            email: data.user.email
          }));
        } else {
          setError('Không thể lấy thông tin tài khoản');
        }
      } catch (err) {
        console.error('Lỗi khi lấy thông tin tài khoản:', err);
        setError('Lỗi kết nối server');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    fetchEmailConfig();
  }, [router, activeTab]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: typeof formData) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setEmailConfig((prev: typeof emailConfig) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  // Xử lý thay đổi trường trong form tạo tài khoản mới
  const handleNewAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAccount((prev: typeof newAccount) => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Lấy danh sách người dùng
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/account/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Quan trọng: gửi cookie xác thực
        cache: 'no-store',
      });
      
      const data = await res.json();
      console.log('Kết quả lấy danh sách người dùng:', data);
      
      if (data.success) {
        setUsers(data.users || []);
      } else {
        console.error('Lỗi khi lấy danh sách người dùng:', data.message);
        // Hiển thị lỗi cho người dùng
        setError(data.message || 'Không thể lấy danh sách người dùng');
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách người dùng:', err);
      setError('Lỗi kết nối server khi lấy danh sách người dùng');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // Xóa người dùng
  const handleDeleteUser = async (userId: string) => {
    try {
      setDeleteLoading(userId);
      setShowDeleteConfirm(null);
      
      const res = await fetch(`/api/account/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Xóa người dùng thành công');
        // Cập nhật danh sách người dùng
        fetchUsers();
      } else {
        setError(data.message || 'Xóa người dùng thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi xóa người dùng:', err);
      setError('Lỗi kết nối server');
    } finally {
      setDeleteLoading(null);
    }
  };
  
  // Xử lý tạo tài khoản mới
  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateAccountLoading(true);
    setError('');
    setSuccess('');
    
    // Kiểm tra mật khẩu khớp nhau
    if (newAccount.password !== newAccount.confirmPassword) {
      setError('Mật khẩu không khớp');
      setCreateAccountLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/account/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newAccount.username,
          email: newAccount.email,
          password: newAccount.password
        }),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Tạo tài khoản mới thành công');
        // Reset form
        setNewAccount({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        // Cập nhật danh sách người dùng
        fetchUsers();
      } else {
        setError(data.message || 'Tạo tài khoản thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi tạo tài khoản mới:', err);
      setError('Lỗi kết nối server');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/account/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Cập nhật thông tin thành công');
        setUser((prev: User | null) => prev ? {
          ...prev,
          username: formData.username,
          email: formData.email
        } : null);
      } else {
        setError(data.message || 'Cập nhật thông tin thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật thông tin:', err);
      setError('Lỗi kết nối server');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError('');
    setSuccess('');

    // Kiểm tra mật khẩu mới khớp nhau
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu mới không khớp');
      setUpdateLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/account/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Cập nhật mật khẩu thành công');
        // Xóa các trường mật khẩu
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setError(data.message || 'Cập nhật mật khẩu thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật mật khẩu:', err);
      setError('Lỗi kết nối server');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleEmailConfigUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError('');
    setSuccess('');

    try {
      // Nếu mật khẩu là ********, không gửi lên server để tránh ghi đè mật khẩu
      const configToSend = {
        ...emailConfig,
        password: emailConfig.password === '********' ? undefined : emailConfig.password
      };

      console.log('Đang gửi cấu hình email:', configToSend);

      const res = await fetch('/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSend),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        // Sử dụng toast thay vì dialog
        toast.success('Cập nhật cấu hình email thành công', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Tải lại cấu hình email từ server sau khi lưu thành công
        // Đợi 500ms để đảm bảo server đã lưu xong dữ liệu
        setTimeout(() => {
          fetchEmailConfig();
        }, 500);
      } else {
        // Sử dụng toast.error thay vì setError
        toast.error(data.message || 'Cập nhật cấu hình email thất bại', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật cấu hình email:', err);
      // Sử dụng toast.error thay vì setError
      toast.error('Lỗi kết nối server', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleTestEmailConnection = async () => {
    setTestEmailStatus('loading');
    setTestEmailMessage('');

    try {
      // Nếu mật khẩu là ********, không gửi lên server để tránh ghi đè mật khẩu
      const configToSend = {
        ...emailConfig,
        password: emailConfig.password === '********' ? undefined : emailConfig.password
      };

      const res = await fetch('/api/email-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSend),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        setTestEmailStatus('success');
        setTestEmailMessage('Kết nối email thành công!');
      } else {
        setTestEmailStatus('error');
        setTestEmailMessage(data.message || 'Kiểm tra kết nối email thất bại');
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra kết nối email:', err);
      setTestEmailStatus('error');
      setTestEmailMessage('Lỗi kết nối server');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '5px solid #f3f3f3', 
            borderTop: '5px solid #1e2e3e', 
            borderRadius: '50%', 
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Đang tải thông tin tài khoản...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '80vh', 
      backgroundColor: '#f5f5f5', 
      padding: '40px 20px' 
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', 
        overflow: 'hidden'
      }}>
        <div style={{ 
          backgroundColor: '#1e2e3e', 
          padding: '20px 30px', 
          color: 'white' 
        }}>
          <h2 style={{ margin: 0, fontSize: '22px' }}>Quản lý tài khoản</h2>
        </div>

        <div style={{ padding: '20px 30px' }}>
          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #ddd', 
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => setActiveTab('profile')}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: activeTab === 'profile' ? '#1e2e3e' : 'transparent', 
                color: activeTab === 'profile' ? 'white' : '#333', 
                border: 'none', 
                borderRadius: activeTab === 'profile' ? '4px 4px 0 0' : '0', 
                cursor: 'pointer',
                fontWeight: '500',
                marginRight: '10px'
              }}
            >
              Thông tin cá nhân
            </button>
            <button 
              onClick={() => setActiveTab('password')}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: activeTab === 'password' ? '#1e2e3e' : 'transparent', 
                color: activeTab === 'password' ? 'white' : '#333', 
                border: 'none', 
                borderRadius: activeTab === 'password' ? '4px 4px 0 0' : '0', 
                cursor: 'pointer',
                fontWeight: '500',
                marginRight: '10px'
              }}
            >
              Đổi mật khẩu
            </button>
            <button 
              onClick={() => setActiveTab('email-config')}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: activeTab === 'email-config' ? '#1e2e3e' : 'transparent', 
                color: activeTab === 'email-config' ? 'white' : '#333', 
                border: 'none', 
                borderRadius: activeTab === 'email-config' ? '4px 4px 0 0' : '0', 
                cursor: 'pointer',
                fontWeight: '500',
                marginRight: '10px'
              }}
            >
              Cấu hình Email
            </button>
            <button 
              onClick={() => setActiveTab('create-account')}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: activeTab === 'create-account' ? '#1e2e3e' : 'transparent', 
                color: activeTab === 'create-account' ? 'white' : '#333', 
                border: 'none', 
                borderRadius: activeTab === 'create-account' ? '4px 4px 0 0' : '0', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Tạo tài khoản mới
            </button>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: '#fce8e6', 
              color: '#d93025', 
              padding: '12px', 
              borderRadius: '4px', 
              marginBottom: '20px', 
              fontSize: '14px' 
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              backgroundColor: '#e6f4ea', 
              color: '#137333', 
              padding: '12px', 
              borderRadius: '4px', 
              marginBottom: '20px', 
              fontSize: '14px' 
            }}>
              {success}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="username" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Nhập tên đăng nhập"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label htmlFor="email" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Nhập email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={updateLoading}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#1e2e3e', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '16px', 
                  fontWeight: '500',
                  cursor: updateLoading ? 'not-allowed' : 'pointer',
                  opacity: updateLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {updateLoading ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="currentPassword" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Mật khẩu hiện tại
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Nhập mật khẩu hiện tại"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="newPassword" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Mật khẩu mới
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Nhập mật khẩu mới"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label htmlFor="confirmPassword" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Xác nhận mật khẩu mới
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={updateLoading}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#1e2e3e', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '16px', 
                  fontWeight: '500',
                  cursor: updateLoading ? 'not-allowed' : 'pointer',
                  opacity: updateLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {updateLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
              </button>
            </form>
          )}

          {/* Email Config Tab */}
          {activeTab === 'email-config' && (
            <form onSubmit={handleEmailConfigUpdate}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="host" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  SMTP Host
                </label>
                <input
                  id="host"
                  name="host"
                  type="text"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Ví dụ: smtp.gmail.com"
                  value={emailConfig.host}
                  onChange={handleEmailConfigChange}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="port" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  SMTP Port
                </label>
                <input
                  id="port"
                  name="port"
                  type="text"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Ví dụ: 587 hoặc 465"
                  value={emailConfig.port}
                  onChange={handleEmailConfigChange}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <input
                    id="secure"
                    name="secure"
                    type="checkbox"
                    style={{ 
                      marginRight: '8px',
                      width: '16px',
                      height: '16px'
                    }}
                    checked={emailConfig.secure}
                    onChange={handleEmailConfigChange}
                  />
                  <label htmlFor="secure" style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#333' 
                  }}>
                    Sử dụng kết nối bảo mật (SSL/TLS)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="email" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder="Nhập địa chỉ email"
                  value={emailConfig.email}
                  onChange={handleEmailConfigChange}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label htmlFor="password" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  Mật khẩu email hoặc mật khẩu ứng dụng
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd', 
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  placeholder={emailConfig.password === '********' ? 'Giữ nguyên mật khẩu hiện tại hoặc nhập mật khẩu mới' : 'Nhập mật khẩu email'}
                  value={emailConfig.password}
                  onChange={handleEmailConfigChange}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Nếu bạn sử dụng Gmail, bạn cần sử dụng "Mật khẩu ứng dụng" thay vì mật khẩu thường.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  type="submit"
                  disabled={updateLoading}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#1e2e3e', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    fontSize: '16px', 
                    fontWeight: '500',
                    cursor: updateLoading ? 'not-allowed' : 'pointer',
                    opacity: updateLoading ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {updateLoading ? 'Đang cập nhật...' : 'Lưu cấu hình'}
                </button>

                <button
                  type="button"
                  disabled={testEmailStatus === 'loading'}
                  onClick={handleTestEmailConnection}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#4285f4', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    fontSize: '16px', 
                    fontWeight: '500',
                    cursor: testEmailStatus === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: testEmailStatus === 'loading' ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {testEmailStatus === 'loading' ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </button>
              </div>

              {testEmailStatus !== 'idle' && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  backgroundColor: testEmailStatus === 'success' ? '#e6f4ea' : (testEmailStatus === 'error' ? '#fce8e6' : '#f1f3f4'),
                  color: testEmailStatus === 'success' ? '#137333' : (testEmailStatus === 'error' ? '#d93025' : '#333'),
                  fontSize: '14px'
                }}>
                  {testEmailMessage}
                </div>
              )}
            </form>
          )}
          
          {/* Create Account Tab */}
          {activeTab === 'create-account' && (
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#1e2e3e' }}>Tạo tài khoản mới</h3>
              <form onSubmit={handleCreateAccount}>
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="new-username" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#333' 
                  }}>
                    Tên đăng nhập
                  </label>
                  <input
                    id="new-username"
                    name="username"
                    type="text"
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd', 
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    placeholder="Nhập tên đăng nhập"
                    value={newAccount.username}
                    onChange={handleNewAccountChange}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="new-email" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#333' 
                  }}>
                    Email
                  </label>
                  <input
                    id="new-email"
                    name="email"
                    type="email"
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd', 
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    placeholder="Nhập email"
                    value={newAccount.email}
                    onChange={handleNewAccountChange}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="new-password" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#333' 
                  }}>
                    Mật khẩu
                  </label>
                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd', 
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    placeholder="Nhập mật khẩu"
                    value={newAccount.password}
                    onChange={handleNewAccountChange}
                  />
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label htmlFor="new-confirm-password" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#333' 
                  }}>
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="new-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd', 
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    placeholder="Nhập lại mật khẩu"
                    value={newAccount.confirmPassword}
                    onChange={handleNewAccountChange}
                  />
                </div>

                <button
                  type="submit"
                  disabled={createAccountLoading}
                  style={{ 
                    padding: '12px 24px', 
                    backgroundColor: '#1e2e3e', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    fontSize: '16px', 
                    fontWeight: '500',
                    cursor: createAccountLoading ? 'not-allowed' : 'pointer',
                    opacity: createAccountLoading ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {createAccountLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản mới'}
                </button>
                
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                  <p><strong>Lưu ý:</strong> Tài khoản mới tạo sẽ có quyền admin và có thể truy cập tất cả các tính năng của hệ thống.</p>
                </div>
              </form>
              
              {/* Danh sách người dùng */}
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#1e2e3e' }}>Danh sách người dùng</h3>
                
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ 
                      width: '30px', 
                      height: '30px', 
                      border: '3px solid #f3f3f3', 
                      borderTop: '3px solid #1e2e3e', 
                      borderRadius: '50%', 
                      margin: '0 auto 10px',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <p>Đang tải danh sách người dùng...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '4px', 
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    Không có người dùng nào trong hệ thống
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tên đăng nhập</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Vai trò</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '12px 16px' }}>{user.username}</td>
                            <td style={{ padding: '12px 16px' }}>{user.email}</td>
                            <td style={{ padding: '12px 16px' }}>{user.role}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              {showDeleteConfirm === user.id ? (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    style={{ 
                                      padding: '6px 12px', 
                                      backgroundColor: '#d93025', 
                                      color: 'white', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer',
                                      fontSize: '13px'
                                    }}
                                  >
                                    Xác nhận
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    style={{ 
                                      padding: '6px 12px', 
                                      backgroundColor: '#f1f3f4', 
                                      color: '#333', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer',
                                      fontSize: '13px'
                                    }}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  disabled={deleteLoading === user.id || user.id === (currentUser?.id)}
                                  style={{ 
                                    padding: '6px 12px', 
                                    backgroundColor: deleteLoading === user.id ? '#f1f3f4' : '#1e2e3e', 
                                    color: deleteLoading === user.id ? '#666' : 'white', 
                                    border: 'none', 
                                    borderRadius: '4px', 
                                    cursor: (deleteLoading === user.id || user.id === (currentUser?.id)) ? 'not-allowed' : 'pointer',
                                    fontSize: '13px',
                                    opacity: (user.id === (currentUser?.id)) ? 0.5 : 1
                                  }}
                                >
                                  {deleteLoading === user.id ? 'Đang xóa...' : 'Xóa'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={fetchUsers}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#f1f3f4', 
                      color: '#333', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Làm mới danh sách
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
