"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import './styles.css';
import DateField from './date-field';
import TimeField from './time-field';
import ClosedFormPage from './components/ClosedFormPage';

// Định nghĩa kiểu dữ liệu cho cấu hình form
interface FieldConfig {
  label: string;
  required: boolean;
  enabled: boolean;
  options?: string[];
  defaultValue?: string;
}

interface FloorLimit {
  floorName: string;
  maxRegistrations: number;
  enabled: boolean;
}

interface RegistrationLimitConfig {
  enabled: boolean;
  maxRegistrationsPerDay: number;
  message: string;
  byFloor?: boolean;
  floorLimits?: FloorLimit[];
}

interface FormConfig {
  title: string;
  isFormClosed?: boolean; // Thêm trường mới để kiểm tra trạng thái đóng/mở form
  registrationLimit?: RegistrationLimitConfig;
  formSchedule?: {
    enabled: boolean;
    openTime: string;
    closeTime: string;
    openDays: number[];
    closedMessage: string;
  };
  fields: {
    [key: string]: FieldConfig;
  };
}

// CSS styles for the form
const styles = {
  noteContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  requiredNote: {
    fontSize: '0.85rem',
    color: '#666',
    margin: 0,
    fontStyle: 'italic'
  }
};

interface FormData {
  name: string;
  email: string;
  phone: string;
  studentId: string; // Thêm trường mã số sinh viên
  school: string;
  floor: string;
  date: string;
  time: string;
  timeOfDay: string;
  purpose: string;
  purposeDetail?: string;
  contact?: string;
}

export default function RegisterPage(): React.ReactElement {
  // Khởi tạo kết nối Socket.IO
  const socketRef = React.useRef<any>(null);
  
  // State để lưu cấu hình form
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [registrationsCount, setRegistrationsCount] = useState<number>(0);
  const [floorRegistrationsCount, setFloorRegistrationsCount] = useState<number>(0);
  const [limitReached, setLimitReached] = useState<boolean>(false);
  const [floorLimitReached, setFloorLimitReached] = useState<boolean>(false);
  // Lưu trữ số lượng đăng ký cho từng tầng
  const [floorCounts, setFloorCounts] = useState<Record<string, number>>({});
  // State để kiểm soát việc hiển thị trang đóng form
  const [formClosed, setFormClosed] = useState<boolean>(false);
  const [closedFormMessage, setClosedFormMessage] = useState<string>('');
  // State để theo dõi trạng thái kết nối Socket.IO
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  
  // Hàm để tải cấu hình form từ API endpoint của trang client
  const fetchFormConfig = async () => {
    try {
      // Sử dụng API endpoint của trang client
      const response = await fetch(`/api/form-config`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Cấu hình form:', data);
        setFormConfig(data);
        
        // Áp dụng giá trị mặc định cho ngày và giờ
        const updatedFormData = {...formData};
        
        // Tự động điều chỉnh ngày mặc định thành ngày mai
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        updatedFormData.date = `${year}-${month}-${day}`;
        
        // Sử dụng giá trị mặc định cho giờ nếu có
        if (data.fields.time?.defaultValue) {
          updatedFormData.time = data.fields.time.defaultValue;
        }
        
        setFormData(updatedFormData);
        
        // Kiểm tra giới hạn đăng ký nếu có
        if (data.registrationLimit && data.registrationLimit.enabled) {
          // Sử dụng ngày mặc định để kiểm tra giới hạn nếu có
          checkRegistrationLimit(updatedFormData.date);
        }
      } else {
        console.error('Lỗi khi tải cấu hình form:', await response.text());
      }
    } catch (error) {
      console.error('Lỗi khi tải cấu hình form:', error);
    } finally {
      setLoadingConfig(false);
    }
  };
  
  // Hàm để kiểm tra số lượt đăng ký cho ngày đích
  const checkRegistrationLimit = async (targetDate = formData.date) => {
    try {
      // Nếu không có ngày đích, sử dụng ngày hiện tại
      if (!targetDate) {
        // Sử dụng múi giờ địa phương thay vì UTC
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`; // Format: YYYY-MM-DD
      }
      
      console.log('Kiểm tra số lượt đăng ký cho ngày:', targetDate);
      
      // Sử dụng URL của server để đảm bảo dữ liệu luôn được cập nhật
      const serverUrl = 'http://localhost:3000';
      
      // Gọi API để lấy số lượt đăng ký cho ngày đích
      const response = await fetch(`${serverUrl}/api/visits/count?date=${targetDate}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Số lượt đăng ký cho ngày ${targetDate} (từ API count):`, data.count);
        const count = data.count || 0;
        
        // Cập nhật số lượt đăng ký và lưu vào localStorage
        setRegistrationsCount(count);
        localStorage.setItem(`registrationsCount_${targetDate}`, count.toString());
        
        // Kiểm tra xem đã đạt giới hạn chưa
        if (formConfig?.registrationLimit?.enabled && 
            count >= formConfig.registrationLimit.maxRegistrationsPerDay) {
          console.log('Đã đạt giới hạn đăng ký cho ngày', targetDate, ':', count, '>=', formConfig.registrationLimit.maxRegistrationsPerDay);
          setLimitReached(true);
          localStorage.setItem(`limitReached_${targetDate}`, 'true');
          
          // Hiển thị thông báo đã đạt giới hạn
          setMessage(formConfig.registrationLimit.message || `Đã đạt giới hạn đăng ký cho ngày ${targetDate}.`);
        } else {
          console.log('Chưa đạt giới hạn đăng ký cho ngày', targetDate, ':', count, '<', formConfig?.registrationLimit?.maxRegistrationsPerDay);
          setLimitReached(false);
          localStorage.setItem(`limitReached_${targetDate}`, 'false');
          setMessage(''); // Xóa thông báo nếu có
        }
      } else {
        // Nếu API không hoạt động, sử dụng phương pháp dự phòng
        console.warn('API count không hoạt động, sử dụng phương pháp dự phòng');
        await countRegistrationsDirectly();
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra số lượt đăng ký:', error);
      // Nếu có lỗi, sử dụng phương pháp dự phòng
      await countRegistrationsDirectly();
    }
  };
  
  // Hàm kiểm tra trạng thái form (mở/đóng)
  const checkFormStatus = async (): Promise<boolean> => {
    try {
      // Kiểm tra sessionStorage trước
      const storedFormClosed = sessionStorage.getItem('formClosed');
      if (storedFormClosed === 'true') {
        const storedMessage = sessionStorage.getItem('closedFormMessage');
        console.log('Form đã đóng theo sessionStorage, hiển thị ClosedFormPage');
        setFormClosed(true);
        setClosedFormMessage(storedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
        return false;
      }
      
      console.log('Kiểm tra trạng thái form từ server...');
      const response = await fetch('/api/form-status', {
        cache: 'no-store', // Đảm bảo luôn lấy dữ liệu mới nhất
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Kết quả kiểm tra trạng thái form từ server:', data);
        
        // Nếu form đã đóng, cập nhật state và sessionStorage để hiển thị ClosedFormPage
        if (!data.isOpen) {
          console.log('Form đã đóng theo server, hiển thị ClosedFormPage với thông báo:', data.message);
          setFormClosed(true);
          setClosedFormMessage(data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.');
          
          // Lưu trạng thái đóng form vào sessionStorage
          sessionStorage.setItem('formClosed', 'true');
          sessionStorage.setItem('closedFormMessage', data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.');
          
          return false;
        } else {
          // Nếu form đã mở, xóa trạng thái đóng form trong sessionStorage
          console.log('Form đang mở theo server, xóa trạng thái đóng trong sessionStorage');
          sessionStorage.removeItem('formClosed');
          sessionStorage.removeItem('closedFormMessage');
          setFormClosed(false);
        }
        
        return data.isOpen;
      }
      
      // Nếu không thể kết nối với server, kiểm tra lại sessionStorage
      const formClosedInStorage = sessionStorage.getItem('formClosed');
      if (formClosedInStorage === 'true') {
        const messageInStorage = sessionStorage.getItem('closedFormMessage');
        console.log('Không thể kết nối server, sử dụng trạng thái từ sessionStorage');
        setFormClosed(true);
        setClosedFormMessage(messageInStorage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
        return false;
      }
      
      return true; // Mặc định cho phép đăng ký nếu không thể kiểm tra
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái form:', error);
      
      // Nếu có lỗi, kiểm tra sessionStorage
      const formClosedInStorage = sessionStorage.getItem('formClosed');
      if (formClosedInStorage === 'true') {
        const messageInStorage = sessionStorage.getItem('closedFormMessage');
        console.log('Lỗi khi kiểm tra server, sử dụng trạng thái từ sessionStorage');
        setFormClosed(true);
        setClosedFormMessage(messageInStorage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
        return false;
      }
      
      return true; // Mặc định cho phép đăng ký nếu có lỗi và không có trạng thái đóng trong sessionStorage
    }
  };

  // Hàm để kiểm tra số lượt đăng ký cho tầng cụ thể
  const checkFloorRegistrationLimit = async (floor: string, date: string) => {
    try {
      // Nếu không có ngày đích, sử dụng ngày hiện tại
      let targetDate = date;
      if (!targetDate) {
        // Sử dụng múi giờ địa phương thay vì UTC
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`; // Format: YYYY-MM-DD
      }
      
      // Nếu không có tầng, không cần kiểm tra
      let targetFloor = floor;
      if (!targetFloor) {
        setFloorLimitReached(false);
        return;
      }
      
      console.log(`Kiểm tra số lượt đăng ký cho tầng ${targetFloor} vào ngày ${targetDate}`);
      
      // Sử dụng URL của server để đảm bảo dữ liệu luôn được cập nhật
      const serverUrl = 'http://localhost:3000';
      
      // Gọi API để lấy số lượt đăng ký cho tầng cụ thể
      const response = await fetch(`${serverUrl}/api/visits/count-floor?date=${targetDate}&floor=${targetFloor}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Số lượt đăng ký cho tầng ${targetFloor} vào ngày ${targetDate}:`, data.count);
        const count = data.count || 0;
        
        // Cập nhật số lượt đăng ký theo tầng
        setFloorRegistrationsCount(count);
        setFloorCounts((prev: Record<string, number>) => ({ ...prev, [targetFloor]: count }));
        localStorage.setItem(`floorRegistrationsCount_${targetDate}_${targetFloor}`, count.toString());
        
        // Kiểm tra giới hạn đăng ký cho từng tầng
        const floorLimit = getFloorLimit(targetFloor);
        
        // Kiểm tra xem đã đạt giới hạn chưa
        if (count >= floorLimit) {
          console.log(`Đã đạt giới hạn đăng ký cho tầng ${targetFloor} vào ngày ${targetDate}:`, count, '>=', floorLimit);
          setFloorLimitReached(true);
          localStorage.setItem(`floorLimitReached_${targetDate}_${targetFloor}`, 'true');
          
          // Hiển thị thông báo đã đạt giới hạn
          setMessage(`Đã đạt giới hạn đăng ký cho Tầng ${targetFloor} vào ngày ${targetDate}. Vui lòng chọn tầng khác.`);
        } else {
          console.log(`Chưa đạt giới hạn đăng ký cho tầng ${targetFloor} vào ngày ${targetDate}:`, count, '<', floorLimit);
          setFloorLimitReached(false);
          localStorage.setItem(`floorLimitReached_${targetDate}_${targetFloor}`, 'false');
          
          // Xóa thông báo nếu không có thông báo giới hạn ngày
          if (!limitReached) {
            setMessage('');
          }
        }
      } else {
        console.warn('API count-floor không hoạt động');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra số lượt đăng ký theo tầng:', error);
    }
  };
  
  // Hàm để lấy giới hạn đăng ký cho từng tầng
  const getFloorLimit = (floor: string): number => {
    // Giá trị mặc định
    let floorLimit = 20;
    
    if (formConfig?.registrationLimit?.byFloor && formConfig.registrationLimit.floorLimits) {
      // Tìm giới hạn cho tầng trong cấu hình
      const floorConfig = formConfig.registrationLimit.floorLimits.find(
        (limit: FloorLimit) => limit.floorName === `Tầng ${floor}` || limit.floorName === floor
      );
      
      if (floorConfig && floorConfig.enabled) {
        floorLimit = floorConfig.maxRegistrations;
      }
    }
    
    return floorLimit;
  };
  
  useEffect(() => {
    // Kiểm tra trạng thái form ngay khi trang được tải
    const checkInitialFormStatus = async () => {
      try {
        console.log('Kiểm tra trạng thái form khi tải trang...');
        const response = await fetch('/api/form-status', {
          cache: 'no-store',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Trạng thái form ban đầu:', data);
          
          if (!data.isOpen) {
            console.log('Form đã đóng, hiển thị ClosedFormPage');
            setFormClosed(true);
            setClosedFormMessage(data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
            
            // Lưu trạng thái đóng form vào sessionStorage để duy trì sau khi refresh
            sessionStorage.setItem('formClosed', 'true');
            sessionStorage.setItem('closedFormMessage', data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
          } else {
            // Xóa trạng thái đóng form nếu form đã mở
            sessionStorage.removeItem('formClosed');
            sessionStorage.removeItem('closedFormMessage');
            setFormClosed(false);
          }
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái form ban đầu:', error);
        
        // Kiểm tra sessionStorage nếu không thể kết nối với server
        const storedFormClosed = sessionStorage.getItem('formClosed');
        if (storedFormClosed === 'true') {
          const storedMessage = sessionStorage.getItem('closedFormMessage');
          setFormClosed(true);
          setClosedFormMessage(storedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
        }
      }
    };
    
    // Gọi hàm kiểm tra trạng thái form ban đầu
    checkInitialFormStatus();
    
    // Thiết lập kết nối Socket.IO với các tùy chọn để xử lý lỗi tốt hơn
    socketRef.current = io('http://localhost:3000', {
      reconnectionAttempts: 10, // Tăng số lần thử kết nối lại
      reconnectionDelay: 1000, // Thời gian chờ giữa các lần kết nối lại (ms)
      reconnectionDelayMax: 5000, // Thời gian chờ tối đa giữa các lần kết nối lại
      timeout: 10000, // Tăng thời gian chờ tối đa cho mỗi lần kết nối (ms)
      autoConnect: true, // Tự động kết nối khi khởi tạo
      transports: ['polling', 'websocket'], // Thử polling trước, sau đó mới dùng websocket
      forceNew: true, // Tạo kết nối mới thay vì tái sử dụng kết nối cũ
      withCredentials: true // Gửi cookie nếu cần
    });
    
    // Xử lý sự kiện kết nối và lỗi kết nối Socket.IO
    socketRef.current.on('connect', () => {
      console.log('Socket.IO đã kết nối thành công, ID:', socketRef.current.id);
    });
    
    socketRef.current.on('connect_error', (error: any) => {
      console.error('Lỗi kết nối Socket.IO:', error.message);
      // Không hiển thị thông báo lỗi cho người dùng
      // Tiếp tục sử dụng các API thông thường thay vì Socket.IO
    });
    
    socketRef.current.on('reconnect', (attemptNumber: number) => {
      console.log(`Socket.IO đã kết nối lại thành công sau ${attemptNumber} lần thử`);
      // Khi kết nối lại thành công, tải lại cấu hình và kiểm tra trạng thái
      fetchFormConfig();
      checkFormStatus();
    });
    
    socketRef.current.on('reconnect_failed', () => {
      console.error('Socket.IO không thể kết nối lại sau nhiều lần thử');
      // Chuyển sang chế độ polling API định kỳ
    });
    
    // Lắng nghe sự kiện cập nhật cấu hình
    socketRef.current.on('config-updated', (data: { timestamp: string }) => {
      console.log('Nhận thông báo cập nhật cấu hình:', data);
      // Tải lại cấu hình form khi nhận được thông báo cập nhật
      fetchFormConfig();
      // Kiểm tra trạng thái form sau khi cập nhật cấu hình
      checkFormStatus();
    });
    
    // Lắng nghe sự kiện thay đổi trạng thái form (mở/đóng)
    socketRef.current.on('form-status-changed', (data: { isOpen: boolean; message: string }) => {
      console.log('Nhận thông báo thay đổi trạng thái form:', data);
      
      // Cập nhật trạng thái form ngay lập tức
      if (!data.isOpen) {
        console.log('Form đã bị đóng, hiển thị trang ClosedFormPage');
        setFormClosed(true);
        setClosedFormMessage(data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
        
        // Lưu trạng thái đóng form vào sessionStorage
        sessionStorage.setItem('formClosed', 'true');
        sessionStorage.setItem('closedFormMessage', data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
      } else {
        console.log('Form đã được mở lại');
        setFormClosed(false);
        
        // Xóa trạng thái đóng form khỏi sessionStorage
        sessionStorage.removeItem('formClosed');
        sessionStorage.removeItem('closedFormMessage');
      }
    });
    
    // Cập nhật trạng thái kết nối khi Socket.IO kết nối/ngắt kết nối
    socketRef.current.on('connect', () => {
      console.log('Socket.IO đã kết nối thành công, ID:', socketRef.current.id);
      setSocketConnected(true);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO đã ngắt kết nối');
      setSocketConnected(false);
    });
    
    // Thiết lập kiểm tra trạng thái form định kỳ
    // Tăng tần suất kiểm tra nếu Socket.IO không hoạt động
    const formStatusCheckInterval = setInterval(() => {
      // Nếu Socket.IO không kết nối, kiểm tra trạng thái thường xuyên hơn
      if (!socketConnected) {
        console.log('Socket.IO không kết nối, kiểm tra trạng thái form qua API...');
        checkFormStatus();
      } else {
        console.log('Kiểm tra định kỳ trạng thái form...');
        checkFormStatus();
      }
    }, socketConnected ? 30000 : 5000); // 30 giây nếu Socket.IO hoạt động, 5 giây nếu không
    
    // Lắng nghe sự kiện đăng ký mới để cập nhật số lượng đăng ký
    socketRef.current.on('new-registration', (data: any) => {
      console.log('Nhận thông báo đăng ký mới:', data);
      // Cập nhật lại số lượng đăng ký nếu cùng ngày
      if (data.date === formData.date) {
        checkRegistrationLimit(formData.date);
        if (formData.floor) {
          checkFloorRegistrationLimit(formData.floor, formData.date);
        }
      }
    });
    
    // Tải cấu hình form
    fetchFormConfig();
    
    // Kiểm tra trạng thái form (mở/đóng)
    checkFormStatus();
    
    // Thiết lập interval để tự động refresh dữ liệu mỗi 10 giây
    const refreshInterval = setInterval(() => {
      console.log('Tự động refresh dữ liệu từ server...');
      
      // Kiểm tra trạng thái form mỗi lần refresh
      checkFormStatus();
      
      // Chỉ refresh dữ liệu từ server, không làm ảnh hưởng đến trạng thái nhập liệu
      // Tải số lượng đăng ký và giới hạn từ server
      if (formData.date) {
        // Sử dụng URL của server để đảm bảo dữ liệu luôn được cập nhật
        const serverUrl = 'http://localhost:3000';
        
        // Gọi API để lấy số lượt đăng ký cho ngày đích
        fetch(`${serverUrl}/api/visits/count?date=${formData.date}`)
          .then(response => response.json())
          .then(data => {
            console.log(`Số lượt đăng ký cho ngày ${formData.date} (tự động refresh):`, data.count);
            const count = data.count || 0;
            
            // Cập nhật số lượt đăng ký và lưu vào localStorage
            setRegistrationsCount(count);
            localStorage.setItem(`registrationsCount_${formData.date}`, count.toString());
            
            // Kiểm tra xem đã đạt giới hạn chưa
            if (formConfig?.registrationLimit?.enabled && 
                count >= formConfig.registrationLimit.maxRegistrationsPerDay) {
              setLimitReached(true);
              localStorage.setItem(`limitReached_${formData.date}`, 'true');
              
              // Hiển thị thông báo đã đạt giới hạn
              setMessage(formConfig.registrationLimit.message || `Đã đạt giới hạn đăng ký cho ngày ${formData.date}.`);
            } else {
              setLimitReached(false);
              localStorage.setItem(`limitReached_${formData.date}`, 'false');
              setMessage(''); // Xóa thông báo nếu có
            }
          })
          .catch(error => console.error('Lỗi khi tự động refresh số lượng đăng ký:', error));
        
        // Nếu đã chọn tầng, cập nhật số lượng đăng ký cho tầng đó
        if (formData.floor) {
          fetch(`${serverUrl}/api/visits/count-floor?date=${formData.date}&floor=${formData.floor}`)
            .then(response => response.json())
            .then(data => {
              console.log(`Số lượt đăng ký cho tầng ${formData.floor} vào ngày ${formData.date} (tự động refresh):`, data.count);
              const count = data.count || 0;
              
              // Cập nhật số lượt đăng ký theo tầng
              setFloorRegistrationsCount(count);
              setFloorCounts((prev: Record<string, number>) => ({ ...prev, [formData.floor]: count }));
              localStorage.setItem(`floorRegistrationsCount_${formData.date}_${formData.floor}`, count.toString());
              
              // Kiểm tra giới hạn đăng ký cho từng tầng
              const floorLimit = getFloorLimit(formData.floor);
              
              // Kiểm tra xem đã đạt giới hạn chưa
              if (count >= floorLimit) {
                setFloorLimitReached(true);
                localStorage.setItem(`floorLimitReached_${formData.date}_${formData.floor}`, 'true');
                
                // Hiển thị thông báo đã đạt giới hạn
                setMessage(`Đã đạt giới hạn đăng ký cho Tầng ${formData.floor} vào ngày ${formData.date}. Vui lòng chọn tầng khác.`);
              } else {
                setFloorLimitReached(false);
                localStorage.setItem(`floorLimitReached_${formData.date}_${formData.floor}`, 'false');
                
                // Xóa thông báo nếu không có thông báo giới hạn ngày
                if (!limitReached) {
                  setMessage('');
                }
              }
            })
            .catch(error => console.error('Lỗi khi tự động refresh số lượng đăng ký theo tầng:', error));
        }
      }
      
      // Kiểm tra trạng thái form (mở/đóng)
      checkFormStatus();
    }, 10000); // 10 giây
    
    // Dọn dẹp khi component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('config-updated');
        socketRef.current.off('new-registration');
        socketRef.current.off('form-status-changed');
        socketRef.current.disconnect();
      }
      
      // Xóa các interval khi component unmount
      clearInterval(refreshInterval);
      clearInterval(formStatusCheckInterval);
    };
  }, []);
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    studentId: '', // Thêm trường mã số sinh viên
    school: '',
    floor: '',
    date: '',
    time: '',
    timeOfDay: '',
    purpose: '',
    purposeDetail: '',
    contact: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionData, setSubmissionData] = useState<{
    name: string;
    time: string;
    date: string;
  }>({ name: '', time: '', date: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Khi người dùng thay đổi ngày đăng ký, kiểm tra lại giới hạn đăng ký cho ngày mới
    if (name === 'date' && value) {
      console.log(`Người dùng đã thay đổi ngày đăng ký thành: ${value}`);
      
      // Sử dụng setTimeout để đảm bảo formData đã được cập nhật trước khi kiểm tra
      setTimeout(() => {
        // Kiểm tra giới hạn đăng ký bất kể cấu hình giới hạn có được bật hay không
        checkRegistrationLimit(value);
        
        // Nếu đã chọn tầng, kiểm tra giới hạn đăng ký cho tầng đó với ngày mới
        if (formData.floor) {
          checkFloorRegistrationLimit(formData.floor, value);
        }
        
        // Đặt lại trạng thái limitReached để đảm bảo thông tin giới hạn được hiển thị
        if (formConfig?.registrationLimit?.enabled) {
          const savedLimitReached = localStorage.getItem(`limitReached_${value}`);
          if (savedLimitReached !== 'true') {
            setLimitReached(false);
          }
        }
      }, 0);
    }
    
    // Khi người dùng thay đổi tầng, kiểm tra lại giới hạn đăng ký cho tầng mới
    if (name === 'floor' && value) {
      console.log(`Người dùng đã thay đổi tầng thành: ${value}`);
      
      // Sử dụng setTimeout để đảm bảo formData đã được cập nhật trước khi kiểm tra
      setTimeout(() => {
        // Kiểm tra giới hạn đăng ký cho tầng mới
        checkFloorRegistrationLimit(value, formData.date);
        
        // Kiểm tra ngay xem tầng đã chọn có đạt giới hạn không
        const floorCount = floorCounts[value] || 0;
        const floorLimit = getFloorLimit(value);
        
        if (floorCount >= floorLimit) {
          // Nếu tầng đã đạt giới hạn, đặt trạng thái floorLimitReached và hiển thị thông báo
          setFloorLimitReached(true);
          setMessage(`Đã đạt giới hạn đăng ký cho Tầng ${value} vào ngày ${formData.date}. Vui lòng chọn tầng khác.`);
        } else {
          // Nếu tầng chưa đạt giới hạn, đặt lại trạng thái
          setFloorLimitReached(false);
          setMessage('');
        }
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Kiểm tra sessionStorage trước khi gửi đăng ký
    const storedFormClosed = sessionStorage.getItem('formClosed');
    if (storedFormClosed === 'true') {
      const storedMessage = sessionStorage.getItem('closedFormMessage');
      console.log('Form đã đóng theo sessionStorage, không thể gửi đăng ký');
      setFormClosed(true);
      setClosedFormMessage(storedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
      setLoading(false);
      return;
    }
    
    // Kiểm tra trạng thái form (mở/đóng) trước khi gửi đăng ký
    try {
      console.log('Kiểm tra trạng thái form từ server trước khi gửi đăng ký...');
      const response = await fetch('/api/form-status', {
        cache: 'no-store', // Đảm bảo luôn lấy dữ liệu mới nhất
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Kết quả kiểm tra trạng thái form trước khi gửi đăng ký:', data);
        
        // Nếu form đã đóng, hiển thị trang ClosedFormPage và dừng việc gửi đăng ký
        if (!data.isOpen) {
          console.log('Form đã đóng theo server, không thể gửi đăng ký');
          setFormClosed(true);
          setClosedFormMessage(data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
          
          // Lưu trạng thái đóng form vào sessionStorage
          sessionStorage.setItem('formClosed', 'true');
          sessionStorage.setItem('closedFormMessage', data.message || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
          
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái form trước khi gửi đăng ký:', error);
      
      // Kiểm tra lại sessionStorage nếu có lỗi khi kiểm tra trạng thái form
      const formClosedInStorage = sessionStorage.getItem('formClosed');
      if (formClosedInStorage === 'true') {
        const messageInStorage = sessionStorage.getItem('closedFormMessage');
        console.log('Lỗi khi kiểm tra server, sử dụng trạng thái từ sessionStorage');
        setFormClosed(true);
        setClosedFormMessage(messageInStorage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.');
        setLoading(false);
        return;
      }
    }
    
    // Kiểm tra dữ liệu đầu vào
    if (!formData.name || !formData.email || !formData.phone || !formData.date || !formData.purpose) {
      setMessage('Vui lòng điền đầy đủ thông tin bắt buộc');
      setLoading(false);
      return;
    }
    
    // Kiểm tra giới hạn đăng ký
    if (formConfig?.registrationLimit?.enabled) {
      // Cập nhật số lượt đăng ký hiện tại
      await checkRegistrationLimit();
      
      // Kiểm tra xem đã đạt giới hạn chưa
      if (limitReached) {
        setMessage(formConfig.registrationLimit.message || 'Rất tiếc, số lượt đăng ký trong ngày hôm nay đã đạt giới hạn. Vui lòng thử lại vào ngày mai.');
        setLoading(false);
        return;
      }
    }
    
    // Kiểm tra giới hạn đăng ký theo tầng
    if (formData.floor) {
      await checkFloorRegistrationLimit(formData.floor, formData.date);
      
      // Kiểm tra xem đã đạt giới hạn tầng chưa
      if (floorLimitReached) {
        setMessage(`Đã đạt giới hạn đăng ký cho Tầng ${formData.floor} vào ngày ${formData.date}. Vui lòng chọn tầng khác.`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('http://localhost:3000/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
        const formattedTime = `${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Lưu thông tin đăng ký thành công
        setSubmissionData({
          name: formData.name,
          time: formattedTime,
          date: formattedDate
        });
        
        // Chuyển sang trạng thái đã gửi
        setIsSubmitted(true);
        
        // Thông báo cho admin rằng có đăng ký mới (không cần vì server đã tự động gửi thông báo)
        console.log('Đã gửi đăng ký thành công');
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          studentId: '',
          school: '',
          floor: '',
          date: '',
          time: '',
          timeOfDay: '',
          purpose: '',
          purposeDetail: '',
          contact: ''
        });
        
        // Cập nhật lại số lượt đăng ký sau khi đăng ký thành công
        if (formConfig?.registrationLimit?.enabled) {
          // Tăng số lượt đăng ký đã sử dụng
          setRegistrationsCount(prev => prev + 1);
          
          // Kiểm tra xem đã đạt giới hạn chưa
          const newCount = registrationsCount + 1;
          if (newCount >= formConfig.registrationLimit.maxRegistrationsPerDay) {
            setLimitReached(true);
          }
        }
      } else {
        setMessage(`Lỗi: ${data.error}`);
      }
    } catch (error) {
      setMessage('Đã xảy ra lỗi khi gửi đăng ký. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm để đếm số lượt đăng ký trực tiếp từ file dữ liệu cho ngày đích
  const countRegistrationsDirectly = async (targetDate = formData.date) => {
    try {
      // Nếu không có ngày đích, sử dụng ngày hiện tại
      if (!targetDate) {
        // Sử dụng múi giờ địa phương thay vì UTC
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        targetDate = `${year}-${month}-${day}`; // Format: YYYY-MM-DD
      }
      console.log('Đếm số lượt đăng ký cho ngày:', targetDate);
      
      // Sử dụng API endpoint đếm số lượt đăng ký cho ngày đích
      const countResponse = await fetch(`http://localhost:3000/api/visits/count?date=${targetDate}`);
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        const count = countData.count || 0;
        console.log(`Số lượt đăng ký cho ngày ${targetDate} (từ API đếm):`, count);
        return count;
      }
      
      // Nếu API đếm không hoạt động, sử dụng phương pháp dự phòng
      const response = await fetch('http://localhost:3000/api/visits');
      
      if (response.ok) {
        const visits = await response.json();
        
        // Đếm số lượt đăng ký cho ngày đích
        const targetDateVisits = visits.filter((visit: any) => {
          return visit.date === targetDate;
        });
        
        console.log(`Các lượt đăng ký cho ngày ${targetDate}:`, targetDateVisits);
        console.log(`Số lượt đăng ký cho ngày ${targetDate} (đếm trực tiếp):`, targetDateVisits.length);
        return targetDateVisits.length;
      }
      return 0;
    } catch (error) {
      console.error('Lỗi khi đếm số lượt đăng ký trực tiếp:', error);
      return 0;
    }
  };
  
  // Hàm cập nhật số lượt đăng ký cho ngày đích
  const updateRegistrationsCount = async (targetDate = formData.date) => {
    if (formConfig?.registrationLimit?.enabled) {
      const count = await countRegistrationsDirectly(targetDate);
      console.log(`Cập nhật số lượt đăng ký cho ngày ${targetDate}:`, count, 'Giới hạn:', formConfig.registrationLimit.maxRegistrationsPerDay);
      setRegistrationsCount(count);
      
      // Kiểm tra xem đã đạt giới hạn chưa
      if (count >= formConfig.registrationLimit.maxRegistrationsPerDay) {
        console.log(`Đã đạt giới hạn đăng ký cho ngày ${targetDate}!`);
        setLimitReached(true);
      } else {
        console.log(`Chưa đạt giới hạn đăng ký cho ngày ${targetDate}`);
        setLimitReached(false);
      }
    }
  };
  
  // Kiểm tra giới hạn đăng ký khi component được render và lưu trạng thái vào localStorage
  useEffect(() => {
    const checkLimitAndSaveState = async () => {
      if (formConfig?.registrationLimit?.enabled && formData.date) {
        try {
          // Gọi cả hai phương pháp để đảm bảo số lượt đăng ký được đếm chính xác
          await updateRegistrationsCount(formData.date);
          await checkRegistrationLimit(formData.date);
          
          // Lưu trạng thái đã đạt giới hạn vào localStorage cho ngày đích
          if (registrationsCount >= formConfig.registrationLimit.maxRegistrationsPerDay) {
            localStorage.setItem(`limitReached_${formData.date}`, 'true');
            setLimitReached(true);
          } else {
            localStorage.setItem(`limitReached_${formData.date}`, 'false');
            setLimitReached(false);
          }
        } catch (error) {
          console.error('Lỗi khi kiểm tra giới hạn đăng ký:', error);
        }
      }
    };
    
    checkLimitAndSaveState();
  }, [formConfig, registrationsCount, formData.date]);
  
  // Kiểm tra trạng thái đã đạt giới hạn từ localStorage khi component mount hoặc khi ngày đăng ký thay đổi
  useEffect(() => {
    if (!formData.date) return;
    
    const targetDate = formData.date;
    const savedLimitReached = localStorage.getItem(`limitReached_${targetDate}`);
    
    if (savedLimitReached === 'true') {
      console.log(`Đã đạt giới hạn đăng ký cho ngày ${targetDate} (từ localStorage)!`);
      setLimitReached(true);
    } else {
      // Nếu không có thông tin trong localStorage hoặc chưa đạt giới hạn, kiểm tra lại
      checkRegistrationLimit(targetDate);
    }
    
    // Kiểm tra lại số lượt đăng ký mỗi 5 giây
    if (formConfig?.registrationLimit?.enabled) {
      const intervalId = setInterval(() => {
        console.log(`Kiểm tra lại số lượt đăng ký cho ngày ${targetDate}...`);
        updateRegistrationsCount(targetDate);
        checkRegistrationLimit(targetDate);
        
        // Cập nhật trạng thái vào localStorage
        if (registrationsCount >= (formConfig?.registrationLimit?.maxRegistrationsPerDay || 0)) {
          localStorage.setItem(`limitReached_${targetDate}`, 'true');
          setLimitReached(true);
        }
      }, 5000); // 5 giây
      
      return () => clearInterval(intervalId);
    }
  }, [formData.date, formConfig]);
  
  // Hiển thị thông tin về giới hạn đăng ký cho ngày đích
  const renderRegistrationLimitInfo = () => {
    // Thêm log để debug vấn đề
    console.log('Debug renderRegistrationLimitInfo:', {
      registrationLimitEnabled: formConfig?.registrationLimit?.enabled,
      limitReached,
      formDate: formData.date,
      registrationsCount,
      maxRegistrationsPerDay: formConfig?.registrationLimit?.maxRegistrationsPerDay
    });
    
    if (formConfig?.registrationLimit?.enabled && !limitReached && formData.date) {
      const remaining = Math.max(0, formConfig.registrationLimit.maxRegistrationsPerDay - registrationsCount);
      
      // Format ngày để hiển thị
      let displayDate = formData.date;
      try {
        const dateObj = new Date(formData.date);
        displayDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) {
        console.error('Lỗi khi format ngày:', e);
      }
      
      return (
        <div style={{ 
          backgroundColor: '#e6f7ff', 
          color: '#0070f3', 
          padding: '10px 15px',
          borderRadius: '5px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>
            {/* Ngày <strong>{displayDate}</strong> còn <strong>{remaining}</strong> lượt đăng ký (tổng cộng {formConfig.registrationLimit.maxRegistrationsPerDay} lượt mỗi ngày). */}
            Ngày <strong>{displayDate}</strong> còn <strong>{remaining}</strong> lượt đăng ký.
          </span>
        </div>
      );
    }
    return null;
  };
  
  // Hiển thị thông báo khi form bị đóng
  const renderFormClosedMessage = () => {
    if (formConfig?.isFormClosed) {
      return (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#d32f2f', 
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          fontSize: '0.95rem',
          border: '1px solid #ffcdd2',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <div>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Form đã đóng</p>
            <p style={{ margin: '0' }}>Form đăng ký hiện đã đóng. Vui lòng quay lại sau.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Hiển thị thông báo khi đã đạt giới hạn đăng ký
  const renderLimitReachedMessage = () => {
    // Nếu đạt giới hạn đăng ký theo ngày
    if (limitReached && formConfig?.registrationLimit?.enabled) {
      return (
        <div style={{ 
          backgroundColor: '#fff3e0', 
          color: '#ff9800', 
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          fontSize: '0.95rem',
          border: '1px solid #ffe0b2',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Đã đạt giới hạn đăng ký</p>
            <p style={{ margin: '0' }}>{formConfig.registrationLimit.message}</p>
          </div>
        </div>
      );
    }
    
    // Nếu đạt giới hạn đăng ký theo tầng
    if (floorLimitReached && formData.floor) {
      return (
        <div style={{ 
          backgroundColor: '#fff3e0', 
          color: '#ff9800', 
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          fontSize: '0.95rem',
          border: '1px solid #ffe0b2',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Tầng đã đạt giới hạn đăng ký</p>
            <p style={{ margin: '0' }}>Tầng {formData.floor} đã đạt giới hạn đăng ký. Vui lòng chọn tầng khác để tiếp tục.</p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Hiển thị trang thông báo đăng ký thành công
  if (isSubmitted) {
    return (
      <div className="success-page">
        <div className="card">
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h1 className="success-title">Đăng ký thành công!</h1>
          <p className="success-message">
            Đăng ký thành công cho "{submissionData.name}" vào lúc {submissionData.time} ngày {submissionData.date}.
          </p>
          <p className="success-details">
            Vui lòng đợi email thông báo về việc đăng ký của bạn.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              // Chỉ reset trạng thái đã gửi, không reset các giá trị mặc định
              setIsSubmitted(false);
              
              // Khôi phục giá trị mặc định cho ngày
              if (formConfig) {
                // Tự động điều chỉnh ngày mặc định thành ngày mai
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const year = tomorrow.getFullYear();
                const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                const day = String(tomorrow.getDate()).padStart(2, '0');
                const defaultDate = `${year}-${month}-${day}`;
                
                // Cập nhật form data với các giá trị mặc định
                setFormData(prev => ({
                  ...prev,
                  name: '',
                  email: '',
                  phone: '',
                  studentId: '',
                  school: '',
                  floor: '',
                  purpose: '',
                  purposeDetail: '',
                  contact: '',
                  date: defaultDate,
                  time: formConfig.fields.time?.defaultValue || ''
                }));
                
                // Kiểm tra lại số lượt đăng ký cho ngày mặc định
                checkRegistrationLimit(defaultDate);
              }
            }}
          >
            Đăng ký mới
          </button>
        </div>
      </div>
    );
  }

  // Hiển thị form đăng ký
  // Nếu form đã đóng (từ API hoặc từ cấu hình), hiển thị trang ClosedFormPage
  if (formClosed || formConfig?.isFormClosed) {
    console.log('Form đã đóng, hiển thị ClosedFormPage');
    const message = closedFormMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.';
    return <ClosedFormPage message={message} />;
  }

  return (
    <div>
      {/* Thông báo giới hạn đăng ký đã được xóa khỏi phần trên trang, chỉ hiển thị trong form */}
      
      <div className="card">
        {loadingConfig ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Đang tải thông tin...</p>
          </div>
        ) : (
          <>
            <h1 className="card-title">{formConfig?.title || 'Đăng ký lên văn phòng'}</h1> 
            {/* Hiển thị thông tin về giới hạn đăng ký nếu form không bị đóng */}
            {!formConfig?.isFormClosed && renderRegistrationLimitInfo()}
            
            {/* Hiển thị thông báo khi đạt giới hạn nếu form không bị đóng */}
            {!formConfig?.isFormClosed && renderLimitReachedMessage()}
            {/* Xóa phần code dưới đây để tránh hiển thị trùng lặp */}
            {false && limitReached && formConfig?.registrationLimit?.enabled && (
              <div style={{ 
                backgroundColor: '#fff3e0', 
                color: '#ff9800', 
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '20px',
                fontSize: '0.95rem',
                border: '1px solid #ffe0b2',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Đã đạt giới hạn đăng ký</p>
                  <p style={{ margin: '0' }}>{formConfig?.registrationLimit?.message || 'Rất tiếc, số lượt đăng ký trong ngày hôm nay đã đạt giới hạn. Vui lòng thử lại vào ngày mai.'}</p>
                </div>
              </div>
            )}
            
            {/* Chỉ hiển thị form nếu form không bị đóng */}
            {!formConfig?.isFormClosed && (
              <form onSubmit={handleSubmit} style={{ opacity: limitReached ? '0.7' : '1', pointerEvents: limitReached ? 'none' : 'auto' }}>
              {/* Họ và tên */}
              {formConfig?.fields.name?.enabled && (
                <div className="form-group">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder={`${formConfig.fields.name.label} ${formConfig.fields.name.required ? '*' : ''}`}
                    required={formConfig.fields.name.required}
                    value={formData.name}
                    onChange={handleChange}
                    disabled={floorLimitReached}
                  />
                </div>
              )}
              
              {/* Số điện thoại */}
              {formConfig?.fields.phone?.enabled && (
                <div className="form-group">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-input"
                    placeholder={`${formConfig.fields.phone.label} ${formConfig.fields.phone.required ? '*' : ''}`}
                    required={formConfig.fields.phone.required}
                    pattern="[0-9]*"
                    title="Số điện thoại chỉ được chứa số"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={floorLimitReached}
                  />
                </div>
              )}
              
              {/* Email */}
              {formConfig?.fields.email?.enabled && (
                <div className="form-group">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={`${formConfig.fields.email.label} ${formConfig.fields.email.required ? '*' : ''}`}
                    required={formConfig.fields.email.required}
                    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                    title="Email phải đúng định dạng và chứa ký tự @"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={floorLimitReached}
                  />
                </div>
              )}
              
              {/* Trường đại học */}
              {formConfig?.fields.school?.enabled && (
                <div className="form-group">
                  <select
                    id="school"
                    name="school"
                    value={formData.school || ''}
                    onChange={handleChange}
                    required={formConfig.fields.school.required}
                    disabled={floorLimitReached}
                  >
                    <option value="" disabled>{`${formConfig.fields.school.label} ${formConfig.fields.school.required ? '*' : ''}`}</option>
                    {formConfig.fields.school.options?.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Mã số sinh viên */}
              {formConfig?.fields.studentId?.enabled && (
                <div className="form-group">
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    placeholder={`${formConfig.fields.studentId.label} ${formConfig.fields.studentId.required ? '*' : ''}`}
                    required={formConfig.fields.studentId.required}
                    value={formData.studentId}
                    onChange={handleChange}
                    disabled={floorLimitReached}
                  />
                </div>
              )}
              
              {/* Mục đích */}
              {formConfig?.fields.purpose?.enabled && (
                <div className="form-group">
                  <select 
                    name="purpose" 
                    onChange={handleChange} 
                    value={formData.purpose || ''} 
                    required={formConfig.fields.purpose.required}
                    disabled={floorLimitReached}
                  >
                    <option value="" disabled>{`${formConfig.fields.purpose.label} ${formConfig.fields.purpose.required ? '*' : ''}`}</option>
                    {formConfig.fields.purpose.options?.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Tầng */}
              {formConfig?.fields.floor?.enabled && (
                <div className="form-group">
                  <select
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    required={formConfig.fields.floor.required}
                    className={floorCounts[formData.floor] >= getFloorLimit(formData.floor) ? 'limit-reached' : ''}
                    style={{ borderColor: floorLimitReached ? '#ff9800' : '' }}
                  >
                    <option value="" disabled>
                      {`${formConfig.fields.floor.label} ${formConfig.fields.floor.required ? '*' : ''}`}
                    </option>
                    {formConfig.fields.floor.options?.map((option, index) => {
                      // Xác định giới hạn cho từng tầng từ cấu hình form
                      const floorLimit = getFloorLimit(option);
                      
                      // Kiểm tra xem tầng này có phải là tầng được chọn hiện tại không
                      const isCurrentFloor = option === formData.floor;
                      
                      // Lấy số lượng đăng ký cho tầng này
                      const floorCount = floorCounts[option] || 0;
                      
                      // Kiểm tra xem tầng này đã đạt giới hạn chưa
                      const isFloorLimitReached = floorCounts[option] >= floorLimit;
                      
                      return (
                        <option 
                          key={index} 
                          value={option} 
                          className={isFloorLimitReached ? 'limit-reached' : ''}
                          disabled={isFloorLimitReached}
                        >
                          {option} {isFloorLimitReached ? ' - Đã đầy' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {formData.floor && formConfig?.registrationLimit?.byFloor && (
                    <div className="floor-info">
                      <p style={{
                        fontSize: '0.9rem',
                        color: '#555',
                        margin: '8px 0 12px 2px',
                        fontStyle: 'italic',
                        textAlign: 'left'
                      }} className={floorCounts[formData.floor] >= getFloorLimit(formData.floor) ? 'limit-reached' : ''}>
                        Số lượng {formData.floor} còn trống: {Math.max(0, getFloorLimit(formData.floor) - (floorCounts[formData.floor] || 0))} chỗ
                        {floorCounts[formData.floor] >= getFloorLimit(formData.floor) ? ' - Đã đầy' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ngày đăng ký */}
              {formConfig?.fields.date?.enabled && (
                <DateField 
                  label={formConfig.fields.date.label}
                  required={formConfig.fields.date.required}
                  value={formData.date}
                  onChange={handleChange}
                  disabled={floorLimitReached}
                />
              )}
              
              {/* Giờ */}
              {formConfig?.fields.time?.enabled && (
                <TimeField 
                  label={formConfig.fields.time.label}
                  required={formConfig.fields.time.required}
                  value={formData.time}
                  onChange={handleChange}
                  disabled={floorLimitReached}
                />
              )}
              
              {/* Người liên hệ */}
              {formConfig?.fields.contact?.enabled && (
                <div className="form-group">
                  <select
                    name="contact"
                    value={formData.contact || ''}
                    onChange={handleChange}
                    required={formConfig.fields.contact.required}
                    disabled={floorLimitReached}
                  >
                    <option value="" disabled>{`${formConfig.fields.contact.label} ${formConfig.fields.contact.required ? '*' : ''}`}</option>
                    {formConfig.fields.contact.options?.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <p style={{
                fontSize: '0.9rem',
                color: '#555',
                margin: '8px 0 12px 2px',
                fontStyle: 'italic',
                textAlign: 'left'
              }}>* là thông tin bắt buộc phải điền</p>
              
              <button
                type="submit"
                disabled={loading || floorLimitReached}
                className="btn btn-primary"
              >
                {loading ? 'Đang xử lý...' : 'Gửi đăng ký'}
              </button>
            </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
