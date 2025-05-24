"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import './styles.css';
import './mui-pickers.css';
import ClosedFormPage from './components/ClosedFormPage';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { TextField } from '@mui/material';
import { MuiCustomProvider } from './mui-custom-config';
import dayjs from 'dayjs';
import { format, parse } from 'date-fns';

// Định nghĩa kiểu dữ liệu cho cấu hình form
// Định nghĩa kiểu dữ liệu cho tùy chọn
interface FieldOption {
  value: string;
  label: string;
}

interface FieldConfig {
  label: string;
  required: boolean;
  enabled: boolean;
  options?: string[] | FieldOption[];
  defaultValue?: string;
  fieldType?: string;
  placeholder?: string;
  isCustom?: boolean;
  allowDateChange?: boolean; // Thêm thuộc tính cho phép thay đổi ngày
  dateFormat?: string; // Định dạng hiển thị ngày (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd)
  allowTimeChange?: boolean; // Thêm thuộc tính cho phép thay đổi thời gian
  order?: number; // Thứ tự hiển thị của trường
  timeFormat?: string; // Định dạng hiển thị thời gian (24h hoặc 12h)
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
  registrationLimit?: RegistrationLimitConfig;
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

// Hàm định dạng ngày theo cấu hình từ admin
const formatDate = (dateStr: string, dateFormat?: string): string => {
  if (!dateStr) return '';
  
  try {
    // Mặc định là dd/mm/yyyy nếu không có cấu hình
    const format = dateFormat || 'dd/mm/yyyy';
    
    // Parse ngày từ chuỗi YYYY-MM-DD (ISO format)
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      // Thử kiểm tra xem có phải định dạng dd/mm/yyyy hoặc mm/dd/yyyy không
      const slashParts = dateStr.split('/');
      if (slashParts.length === 3) {
        // Đã ở định dạng dd/mm/yyyy hoặc mm/dd/yyyy, trả về nguyên
        return dateStr;
      }
      return dateStr; // Trả về nguyên nếu không đúng định dạng
    }
    
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    // Định dạng lại theo cấu hình
    if (format === 'dd/mm/yyyy') {
      return `${day}/${month}/${year}`;
    } else if (format === 'mm/dd/yyyy') {
      return `${month}/${day}/${year}`;
    } else if (format === 'yyyy-mm-dd') {
      return dateStr; // Giữ nguyên định dạng ISO
    }
    
    return dateStr; // Mặc định trả về nguyên nếu không khớp với các định dạng trên
  } catch (error) {
    console.error('Lỗi khi định dạng ngày:', error);
    return dateStr; // Trả về nguyên nếu có lỗi
  }
};

// Hàm định dạng thời gian theo định dạng 12h hoặc 24h
const formatTimeValue = (timeStr: string, format?: string): string => {
  if (!timeStr) return '';
  try {
    // Tách giờ và phút từ chuỗi thời gian
    let hours = 0;
    let minutes = 0;
    let ampm = '';
    
    // Xử lý các định dạng thời gian khác nhau
    if (timeStr.includes(':')) {
      // Định dạng HH:MM hoặc HH:MM AM/PM
      const parts = timeStr.split(':');
      hours = parseInt(parts[0], 10);
      
      if (parts[1].includes(' ')) {
        // Định dạng HH:MM AM/PM
        const minuteAndPeriod = parts[1].split(' ');
        minutes = parseInt(minuteAndPeriod[0], 10);
        ampm = minuteAndPeriod[1];
      } else {
        // Định dạng HH:MM
        minutes = parseInt(parts[1], 10);
      }
    } else {
      // Nếu không có định dạng chuẩn, trả về chuỗi gốc
      return timeStr;
    }
    
    // Chuyển đổi giữa 12h và 24h nếu cần
    if (format === '12h') {
      // Chuyển từ 24h sang 12h
      if (!ampm) {
        if (hours === 0) {
          hours = 12;
          ampm = 'AM';
        } else if (hours === 12) {
          ampm = 'PM';
        } else if (hours > 12) {
          hours = hours - 12;
          ampm = 'PM';
        } else {
          ampm = 'AM';
        }
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } else {
      // Chuyển từ 12h sang 24h hoặc giữ nguyên 24h
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Lỗi định dạng thời gian:', error);
    return timeStr;
  }
};

// Hàm chuyển đổi định dạng ngày từ cấu hình sang định dạng cho MUI DatePicker
const getDatePickerFormat = (dateFormat?: string): string => {
  // Mặc định là DD/MM/YYYY nếu không có cấu hình
  const format = dateFormat || 'dd/mm/yyyy';
  
  // Chuyển đổi định dạng ngày sang định dạng của dayjs
  if (format === 'dd/mm/yyyy') {
    return 'DD/MM/YYYY';
  } else if (format === 'mm/dd/yyyy') {
    return 'MM/DD/YYYY';
  } else if (format === 'yyyy-mm-dd') {
    return 'YYYY-MM-DD';
  }
  
  // Mặc định
  return 'DD/MM/YYYY';
};

// Hàm chuyển đổi định dạng thời gian từ cấu hình sang định dạng cho MUI TimePicker
const getTimePickerFormat = (timeFormat?: string): string => {
  // Mặc định là HH:mm nếu không có cấu hình hoặc định dạng 24h
  if (!timeFormat || timeFormat === '24h') {
    return 'HH:mm';
  } else {
    // Định dạng 12h
    return 'hh:mm A';
  }
};

// Hàm chuyển đổi chuỗi ngày thành đối tượng dayjs
const parseDateToDayjs = (dateStr: string): dayjs.Dayjs | null => {
  if (!dateStr) return null;
  try {
    return dayjs(dateStr);
  } catch (error) {
    console.error('Lỗi khi phân tích chuỗi ngày:', error);
    return null;
  }
};

// Hàm chuyển đổi chuỗi thời gian thành đối tượng dayjs
const parseTimeToDayjs = (timeStr: string): dayjs.Dayjs | null => {
  if (!timeStr) return null;
  try {
    // Tạo đối tượng dayjs với ngày hiện tại và thời gian từ chuỗi
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    
    return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
  } catch (error) {
    console.error('Lỗi khi phân tích chuỗi thời gian:', error);
    return null;
  }
};

// Hàm để giữ lại tương thích với code cũ
const parseDate = (dateStr: string, dateFormat: string): Date | null => {
  if (!dateStr) return null;
  try {
    return parse(dateStr, dateFormat, new Date());
  } catch (error) {
    console.error('Lỗi khi phân tích chuỗi ngày:', error);
    return null;
  }
};

// Hàm để giữ lại tương thích với code cũ
const parseTimeString = (timeStr: string): Date | null => {
  if (!timeStr) return null;
  try {
    const today = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    
    today.setHours(hours);
    today.setMinutes(minutes);
    today.setSeconds(0);
    today.setMilliseconds(0);
    
    return today;
  } catch (error) {
    console.error('Lỗi khi phân tích chuỗi thời gian:', error);
    return null;
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

export default function RegisterPage() {
  return (
    <MuiCustomProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <RegisterForm />
      </LocalizationProvider>
    </MuiCustomProvider>
  );
}

function RegisterForm() {
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
        
        // Kiểm tra xem có giá trị mặc định cho trường ngày từ admin không
        if (data.fields.date?.defaultValue && data.fields.date.defaultValue.trim() !== '') {
          // Sử dụng giá trị mặc định từ admin
          console.log('Sử dụng ngày mặc định từ admin:', data.fields.date.defaultValue);
          
          // Chuyển đổi định dạng ngày từ admin (có thể là dd/mm/yyyy hoặc mm/dd/yyyy) sang định dạng ISO (yyyy-mm-dd)
          let defaultDate = data.fields.date.defaultValue;
          const dateFormat = data.fields.date.dateFormat || 'dd/mm/yyyy';
          
          // Log để debug
          console.log(`Xử lý ngày mặc định: ${defaultDate}, định dạng: ${dateFormat}`);
          
          // Kiểm tra xem ngày đã ở định dạng ISO chưa
          if (!/^\d{4}-\d{2}-\d{2}$/.test(defaultDate)) {
            // Nếu chưa, thực hiện chuyển đổi
            if (dateFormat === 'dd/mm/yyyy') {
              // Chuyển từ dd/mm/yyyy sang yyyy-mm-dd
              const parts = defaultDate.split('/');
              if (parts.length === 3) {
                defaultDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                console.log(`Đã chuyển từ dd/mm/yyyy sang yyyy-mm-dd: ${defaultDate}`);
              }
            } else if (dateFormat === 'mm/dd/yyyy') {
              // Chuyển từ mm/dd/yyyy sang yyyy-mm-dd
              const parts = defaultDate.split('/');
              if (parts.length === 3) {
                defaultDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
                console.log(`Đã chuyển từ mm/dd/yyyy sang yyyy-mm-dd: ${defaultDate}`);
              }
            }
          } else {
            console.log(`Ngày đã ở định dạng ISO: ${defaultDate}`);
          }
          
          // Kiểm tra tính hợp lệ của định dạng ngày
          if (/^\d{4}-\d{2}-\d{2}$/.test(defaultDate)) {
            updatedFormData.date = defaultDate;
            console.log(`Đã thiết lập ngày mặc định: ${defaultDate}`);
          } else {
            console.warn('Định dạng ngày mặc định không hợp lệ:', defaultDate);
            // Sử dụng ngày mai làm giá trị mặc định nếu định dạng không hợp lệ
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');
            updatedFormData.date = `${year}-${month}-${day}`;
            console.log(`Sử dụng ngày mai làm mặc định: ${updatedFormData.date}`);
          }
        } else {
          // Không có giá trị mặc định từ admin, sử dụng ngày mai làm giá trị mặc định
          console.log('Không có ngày mặc định từ admin, sử dụng ngày mai');
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const year = tomorrow.getFullYear();
          const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const day = String(tomorrow.getDate()).padStart(2, '0');
          updatedFormData.date = `${year}-${month}-${day}`;
        }
        
        // Sử dụng giá trị mặc định cho giờ nếu có
        if (data.fields.time?.defaultValue) {
          updatedFormData.time = data.fields.time.defaultValue;
        }
        
        // Log thông tin về định dạng ngày
        console.log('Định dạng ngày từ cấu hình:', data.fields.date?.dateFormat || 'dd/mm/yyyy');
        
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
  
  // Hàm kiểm tra trạng thái form (mở/đóng) - đã đơn giản hóa vì xóa chức năng đặt lịch
  const checkFormStatus = async (): Promise<boolean> => {
    try {
      console.log('Form luôn mở vì đã xóa chức năng đặt lịch');
      
      // Xóa trạng thái đóng form trong sessionStorage nếu có
      sessionStorage.removeItem('formClosed');
      sessionStorage.removeItem('closedFormMessage');
      
      // Cập nhật state
      setFormClosed(false);
      setClosedFormMessage('');
      
      return true; // Form luôn mở
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái form:', error);
      return true; // Mặc định cho phép đăng ký
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
    socketRef.current.on('form-status-changed', async (data: { isOpen: boolean; message: string }) => {
      console.log('Nhận thông báo thay đổi trạng thái form:', data);
      
      // Kiểm tra trước tiên xem tính năng đặt lịch có bị tắt không
      try {
        const configResponse = await fetch('/api/form-config', {
          cache: 'no-store',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          
          // Form luôn mở vì đã xóa chức năng đặt lịch
          console.log('Form luôn mở vì đã xóa chức năng đặt lịch');
          
          // Xóa trạng thái đóng form trong sessionStorage nếu có
          sessionStorage.removeItem('formClosed');
          sessionStorage.removeItem('closedFormMessage');
          
          // Cập nhật state
          setFormClosed(false);
          setClosedFormMessage('');
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra cấu hình form:', error);
      }
      
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
    
    // Log thông tin về định dạng ngày khi gửi form
    console.log('Gửi form với định dạng ngày:', formConfig?.fields.date?.dateFormat || 'dd/mm/yyyy');
    
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
    // Form luôn mở vì đã xóa chức năng đặt lịch
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
  // Nếu form đã đóng (từ API), hiển thị trang ClosedFormPage
  if (formClosed) {
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
            {/* Hiển thị thông tin về giới hạn đăng ký */}
            {renderRegistrationLimitInfo()}
            
            {/* Hiển thị thông báo khi đạt giới hạn */}
            {renderLimitReachedMessage()}
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
            {(
              <form onSubmit={handleSubmit} style={{ opacity: limitReached ? '0.7' : '1', pointerEvents: limitReached ? 'none' : 'auto' }}>
              {/* Render tất cả các trường cơ bản theo thứ tự của admin */}
              {formConfig && Object.entries(formConfig.fields)
                .filter(([fieldName, field]) => 
                  field.enabled && 
                  !field.isCustom && 
                  fieldName !== 'date' && 
                  fieldName !== 'time' &&
                  !['school', 'studentId', 'purpose', 'floor', 'contact'].includes(fieldName)
                )
                // Sắp xếp các trường theo thứ tự nếu có thuộc tính order
                .sort(([, fieldA], [, fieldB]) => {
                  const orderA = fieldA.order !== undefined ? fieldA.order : 999;
                  const orderB = fieldB.order !== undefined ? fieldB.order : 999;
                  return orderA - orderB;
                })
                .map(([fieldName, field]) => {
                  // Xác định loại trường dựa vào fieldType hoặc tên trường
                  const fieldType = field.fieldType || (
                    fieldName === 'email' ? 'email' :
                    fieldName === 'phone' ? 'tel' :
                    'text'
                  );
                  
                  // Xác định các thuộc tính bổ sung dựa vào loại trường
                  const additionalProps: any = {};
                  
                  if (fieldType === 'tel' || fieldName === 'phone') {
                    additionalProps.pattern = "[0-9]*";
                    additionalProps.title = "Số điện thoại chỉ được chứa số";
                  }
                  
                  if (fieldType === 'email' || fieldName === 'email') {
                    additionalProps.pattern = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";
                    additionalProps.title = "Email phải đúng định dạng và chứa ký tự @";
                  }
                  
                  return (
                    <div key={fieldName} className="form-group">
                      <input
                        id={fieldName}
                        name={fieldName}
                        type={fieldType}
                        className="form-input"
                        placeholder={field.placeholder || field.label}
                        required={field.required}
                        value={formData[fieldName] || ''}
                        onChange={handleChange}
                        disabled={floorLimitReached}
                        {...additionalProps}
                      />
                    </div>
                  );
                })
              }
              
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
                    <option value="" disabled>{formConfig.fields.school.label}</option>
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
                    placeholder={formConfig.fields.studentId.placeholder || formConfig.fields.studentId.label}
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
                    <option value="" disabled>{formConfig.fields.purpose.label}</option>
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
                      {formConfig.fields.floor.label}
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

              {/* Các trường tùy chỉnh */}
              {Object.keys(formConfig?.fields || {})
                // Sắp xếp các trường theo thứ tự nếu có thuộc tính order
                .sort((fieldNameA, fieldNameB) => {
                  const fieldA = formConfig?.fields[fieldNameA];
                  const fieldB = formConfig?.fields[fieldNameB];
                  const orderA = fieldA?.order !== undefined ? fieldA.order : 999;
                  const orderB = fieldB?.order !== undefined ? fieldB.order : 999;
                  return orderA - orderB;
                })
                .map(fieldName => {
                const field = formConfig?.fields[fieldName];
                
                // Kiểm tra nếu là trường tùy chỉnh và đã được bật
                if (field?.isCustom && field?.enabled) {
                  
                  return (
                    <div key={fieldName} className="form-group">
                      {field.fieldType === 'text' && (
                        <TextField
                          id={fieldName}
                          name={fieldName}
                          label={field.placeholder || field.label}
                          variant="outlined"
                          size="small"
                          fullWidth
                          required={field.required}
                          value={formData[fieldName] || ''}
                          onChange={handleChange}
                          disabled={floorLimitReached}
                          className="mui-textfield"
                          InputProps={{
                            endAdornment: fieldName === 'name' && (
                              <span className="input-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                              </span>
                            )
                          }}
                        />
                      )}
                      
                      {field.fieldType === 'textarea' && (
                        <textarea
                          id={fieldName}
                          name={fieldName}
                          className="form-textarea"
                          placeholder={field.placeholder || field.label}
                          required={field.required}
                          value={formData[fieldName] || ''}
                          onChange={handleChange}
                          disabled={floorLimitReached}
                          rows={4}
                        />
                      )}
                      
                      {field.fieldType === 'dropdown' && (
                        <select
                          id={fieldName}
                          name={fieldName}
                          value={formData[fieldName] || ''}
                          onChange={handleChange}
                          required={field.required}
                          disabled={floorLimitReached}
                        >
                          <option value="" disabled>{field.label}</option>
                          {field.options?.map((option, index) => (
                            <option key={index} value={typeof option === 'string' ? option : option.value}>
                              {typeof option === 'string' ? option : option.label}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {field.fieldType === 'email' && (
                        <input
                          id={fieldName}
                          name={fieldName}
                          type="email"
                          className="form-input"
                          placeholder={field.placeholder || field.label}
                          required={field.required}
                          value={formData[fieldName] || ''}
                          onChange={handleChange}
                          disabled={floorLimitReached}
                        />
                      )}
                      
                      {field.fieldType === 'number' && (
                        <input
                          id={fieldName}
                          name={fieldName}
                          type="number"
                          className="form-input"
                          placeholder={field.placeholder || field.label}
                          required={field.required}
                          value={formData[fieldName] || ''}
                          onChange={handleChange}
                          disabled={floorLimitReached}
                        />
                      )}
                      
                      {field.fieldType === 'date' && (
                        <>
                          {field.allowDateChange ? (
                            // Khi cho phép thay đổi ngày: hiển thị MUI DatePicker với định dạng từ cấu hình
                            <div className="datepicker-container">
                              <DatePicker
                                label={field.placeholder || field.label}
                                value={formData[fieldName] ? parseDateToDayjs(formData[fieldName]) : null}
                                onChange={(date) => {
                                  // Chuyển đổi date thành chuỗi với định dạng yyyy-MM-dd cho formData
                                  const dateStr = date ? date.format('YYYY-MM-DD') : '';
                                  const event = {
                                    target: {
                                      name: fieldName,
                                      value: dateStr
                                    }
                                  } as React.ChangeEvent<HTMLInputElement>;
                                  handleChange(event);
                                }}
                                format={getDatePickerFormat(field.dateFormat)}
                                disabled={floorLimitReached}
                                slotProps={{
                                  textField: {
                                    id: fieldName,
                                    name: fieldName,
                                    required: field.required,
                                    fullWidth: true,
                                    variant: "outlined",
                                    size: "small",
                                    className: "mui-datepicker"
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            // Khi không cho phép thay đổi ngày: hiển thị input type="text" chỉ đọc
                            <>
                              <input
                                id={fieldName}
                                name={fieldName}
                                type="text"
                                className="form-input"
                                required={field.required}
                                value={(() => {
                                  // Nếu có giá trị mặc định từ admin, sử dụng nó
                                  if (field.defaultValue && field.defaultValue.trim() !== '') {
                                    return field.defaultValue;
                                  }
                                  
                                  // Nếu có giá trị trong formData, sử dụng nó đã được định dạng
                                  if (formData[fieldName]) {
                                    return formatDate(formData[fieldName], field.dateFormat);
                                  }
                                  
                                  // Nếu không có cả hai, hiển thị ngày mai
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  const year = tomorrow.getFullYear();
                                  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                                  const day = String(tomorrow.getDate()).padStart(2, '0');
                                  
                                  // Định dạng ngày mai theo định dạng được cấu hình
                                  if (field.dateFormat === 'dd/mm/yyyy') {
                                    return `${day}/${month}/${year}`;
                                  } else if (field.dateFormat === 'mm/dd/yyyy') {
                                    return `${month}/${day}/${year}`;
                                  } else {
                                    return `${year}-${month}-${day}`;
                                  }
                                })()}
                                readOnly
                                style={{ backgroundColor: '#f9f9f9', cursor: 'default' }}
                              />
                              {console.log(`Debug: Hiển thị ngày (không cho phép thay đổi): ${formData[fieldName]}, định dạng: ${field.dateFormat}, giá trị mặc định: ${field.defaultValue}`)}
                            </>
                          )}
                        </>
                      )}
                      
                      {field.fieldType === 'time' && (
                        <>
                          {field.allowTimeChange ? (
                            // Khi cho phép thay đổi thời gian: hiển thị MUI TimePicker
                            <div className="datepicker-container">
                              <TimePicker
                                label={field.placeholder || field.label}
                                value={formData[fieldName] ? parseTimeToDayjs(formData[fieldName]) : null}
                                onChange={(time) => {
                                  // Chuyển đổi time thành chuỗi với định dạng HH:mm cho formData
                                  const timeStr = time ? time.format('HH:mm') : '';
                                  const event = {
                                    target: {
                                      name: fieldName,
                                      value: timeStr
                                    }
                                  } as React.ChangeEvent<HTMLInputElement>;
                                  handleChange(event);
                                }}
                                format={getTimePickerFormat(field.timeFormat)}
                                ampm={field.timeFormat === '12h'}
                                disabled={floorLimitReached}
                                slotProps={{
                                  textField: {
                                    id: fieldName,
                                    name: fieldName,
                                    required: field.required,
                                    fullWidth: true,
                                    variant: "outlined",
                                    size: "small",
                                    className: "mui-timepicker"
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            // Khi không cho phép thay đổi thời gian: hiển thị input type="text" chỉ đọc
                            <input
                              id={fieldName}
                              name={fieldName}
                              type="text"
                              className="form-input"
                              required={field.required}
                              value={(() => {
                                // Nếu có giá trị mặc định từ admin, sử dụng nó
                                if (field.defaultValue && field.defaultValue.trim() !== '') {
                                  // Định dạng lại thời gian nếu cần
                                  return formatTimeValue(field.defaultValue, field.timeFormat);
                                }
                                
                                // Nếu có giá trị trong formData, sử dụng nó
                                if (formData[fieldName]) {
                                  return formatTimeValue(formData[fieldName], field.timeFormat);
                                }
                                
                                // Nếu không có cả hai, hiển thị thời gian hiện tại
                                const now = new Date();
                                const hours = String(now.getHours()).padStart(2, '0');
                                const minutes = String(now.getMinutes()).padStart(2, '0');
                                
                                // Định dạng thời gian theo định dạng được cấu hình
                                if (field.timeFormat === '12h') {
                                  const hour12 = now.getHours() % 12 || 12;
                                  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
                                  return `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
                                } else {
                                  return `${hours}:${minutes}`;
                                }
                              })()}
                              readOnly
                              style={{ backgroundColor: '#f9f9f9', cursor: 'default' }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                }
                return null;
              })}
              
              {/* Ngày đăng ký */}
              {formConfig?.fields.date?.enabled && (
                <div className="form-group">
                  <input
                    id="date"
                    name="date"
                    type="text"
                    className="form-input"
                    placeholder={formConfig.fields.date.placeholder || formConfig.fields.date.label}
                    required={formConfig.fields.date.required}
                    value={formatDate(formData.date, formConfig.fields.date.dateFormat)}
                    readOnly={true}
                    disabled={floorLimitReached}
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                </div>
              )}
              
              {/* Giờ */}
              {formConfig?.fields.time?.enabled && (
                <div className="form-group">
                  <input
                    id="time"
                    name="time"
                    type="time"
                    className="form-input"
                    placeholder={formConfig.fields.time.placeholder || formConfig.fields.time.label}
                    required={formConfig.fields.time.required}
                    value={formData.time}
                    onChange={handleChange}
                    disabled={floorLimitReached}
                  />
                </div>
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
                    <option value="" disabled>{formConfig.fields.contact.label}</option>
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
