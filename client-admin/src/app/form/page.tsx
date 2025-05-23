"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './styles.css';
import './form-schedule.css';
import './time-picker.css';
import './switch-toggle.css';
import Modal from '../components/Modal';
import CustomTimePicker from '../components/CustomTimePicker';
import { toast } from 'react-toastify';

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

interface FormScheduleConfig {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  openDays: number[];
  closedMessage: string;
}

interface FormConfig {
  title: string;
  isFormClosed?: boolean; // Thêm trường mới để đóng form
  formSchedule?: FormScheduleConfig;
  registrationLimit?: RegistrationLimitConfig;
  fields: {
    [key: string]: FieldConfig;
  };
}

export default function FormConfigPage() {
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'fields' | 'limits'>('general');
  const [isToggling, setIsToggling] = useState<boolean>(false); // Trạng thái khi đang toggle
  
  // Sử dụng useRef để lưu timeout cho debounce
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ title: '', message: '', type: 'info' });
  
  // Modal helper functions
  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    setModalContent({ title, message, type });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  // Xử lý thay đổi tab
  const handleTabChange = (tab: 'general' | 'fields' | 'limits') => {
    // Nếu đang chuyển sang tab giới hạn đăng ký, đồng bộ danh sách tầng
    if (tab === 'limits' && formConfig && formConfig.registrationLimit) {
      // Kiểm tra nếu đã bật giới hạn theo tầng
      if (formConfig.registrationLimit.byFloor) {
        // Lấy danh sách tầng hiện tại
        const floorOptions = formConfig.fields.floor?.options || [];
        // Lấy danh sách giới hạn tầng hiện tại
        const existingFloorLimits = [...(formConfig.registrationLimit.floorLimits || [])];
        const existingFloorNames = existingFloorLimits.map(fl => fl.floorName);
        
        // Kiểm tra xem có tầng nào chưa có trong danh sách giới hạn không
        let needsUpdate = false;
        const updatedFloorLimits = [...existingFloorLimits];
        
        // Thêm các tầng mới vào danh sách giới hạn
        floorOptions.forEach(floorName => {
          if (!existingFloorNames.includes(floorName)) {
            updatedFloorLimits.push({
              floorName,
              maxRegistrations: 3, // Giá trị mặc định
              enabled: true
            });
            needsUpdate = true;
          }
        });
        
        // Lọc bỏ các tầng không còn tồn tại
        const finalFloorLimits = updatedFloorLimits.filter(fl => floorOptions.includes(fl.floorName));
        if (finalFloorLimits.length !== updatedFloorLimits.length) {
          needsUpdate = true;
        }
        
        // Cập nhật danh sách giới hạn tầng nếu có thay đổi
        if (needsUpdate) {
          setFormConfig({
            ...formConfig,
            registrationLimit: {
              ...formConfig.registrationLimit,
              floorLimits: finalFloorLimits
            }
          });
        }
      }
    }
    
    setActiveTab(tab);
  };

  // Tải cấu hình form từ API và đồng bộ với trạng thái form thực tế
  useEffect(() => {
    const fetchFormConfigAndStatus = async () => {
      try {
        // 1. Lấy cấu hình form từ API form-config
        const configResponse = await fetch('/api/form-config');
        
        // 2. Đồng thời lấy trạng thái form hiện tại từ API form-status
        const statusResponse = await fetch('http://localhost:3000/api/form-status');
        
        if (configResponse.ok && statusResponse.ok) {
          const configData = await configResponse.json();
          const statusData = await statusResponse.json();
          
          // Đồng bộ trạng thái form từ API form-status với cấu hình form
          // isOpen = true tương ứng với isFormClosed = false và ngược lại
          const formConfig = {
            ...configData,
            isFormClosed: !statusData.isOpen
          };
          
          // Cập nhật state với dữ liệu đã được đồng bộ
          setFormConfig(formConfig);
          console.log('Trạng thái form đã được đồng bộ:', statusData.isOpen ? 'Mở' : 'Đóng');
        } else if (configResponse.ok) {
          // Nếu chỉ lấy được cấu hình form mà không lấy được trạng thái
          const configData = await configResponse.json();
          setFormConfig(configData);
          console.warn('Không thể đồng bộ trạng thái form, sử dụng trạng thái từ cấu hình');
        } else {
          setMessage({
            text: 'Không thể tải cấu hình form',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Lỗi khi tải cấu hình form:', error);
        setMessage({
          text: 'Lỗi khi tải cấu hình form',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFormConfigAndStatus();
  }, []);

  // Lưu cấu hình form - HOÀN TOÀN TÁCH BIỆT với trạng thái form
  const saveFormConfig = async () => {
    if (!formConfig) return;

    // Lưu trạng thái đóng/mở form hiện tại
    const currentFormClosedState = formConfig.isFormClosed;

    setSaving(true);
    try {
      // Tạo bản sao của formConfig và LOẠI BỎ trạng thái isFormClosed
      // Điều này đảm bảo nút "Lưu cấu hình" không lưu trạng thái form
      const { isFormClosed, ...configWithoutFormStatus } = formConfig;
      
      // Gửi cấu hình form đến server (không bao gồm trạng thái form)
      const response = await fetch('/api/form-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...configWithoutFormStatus,
          isFormClosed: currentFormClosedState // Gửi lại trạng thái ban đầu, không thay đổi
        }),
      });

      if (response.ok) {
        // Sử dụng toast thay vì modal để hiển thị thông báo thành công
        toast.success('Đã lưu cấu hình form thành công', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Đảm bảo trạng thái form không bị thay đổi sau khi lưu cấu hình
        if (formConfig.isFormClosed !== currentFormClosedState) {
          setFormConfig({
            ...formConfig,
            isFormClosed: currentFormClosedState
          });
        }
      } else {
        const errorData = await response.json();
        // Sử dụng toast.error thay vì modal để hiển thị thông báo lỗi
        toast.error(errorData.message || 'Lỗi khi lưu cấu hình form', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      console.error('Lỗi khi lưu cấu hình form:', error);
      // Sử dụng toast.error thay vì modal để hiển thị thông báo lỗi
      toast.error('Lỗi khi lưu cấu hình form', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // Xử lý thay đổi cấu hình mở/đóng form
  const handleFormScheduleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (!formConfig) return;
    
    // Tạo một bản sao của formSchedule hoặc tạo mới nếu chưa có
    const updatedSchedule = formConfig.formSchedule ? { ...formConfig.formSchedule } : {
      enabled: false,
      openTime: '08:00',
      closeTime: '17:00',
      openDays: [1, 2, 3, 4, 5], // Thứ 2 đến thứ 6
      closedMessage: 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
    };
    
    // Cập nhật giá trị dựa trên loại input
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      (updatedSchedule as any)[name] = checkbox.checked;
    } else {
      (updatedSchedule as any)[name] = value;
    }
    
    // Cập nhật formConfig
    setFormConfig({
      ...formConfig,
      formSchedule: updatedSchedule
    });
  };
  
  // Xử lý thay đổi ngày mở cửa
  const handleOpenDayChange = (day: number) => {
    if (!formConfig) return;
    
    // Tạo một bản sao của formSchedule hoặc tạo mới nếu chưa có
    const updatedSchedule = formConfig.formSchedule ? { ...formConfig.formSchedule } : {
      enabled: false,
      openTime: '08:00',
      closeTime: '17:00',
      openDays: [1, 2, 3, 4, 5], // Thứ 2 đến thứ 6
      closedMessage: 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
    };
    
    // Kiểm tra xem ngày đã có trong danh sách chưa
    const openDays = updatedSchedule.openDays || [];
    const index = openDays.indexOf(day);
    
    // Nếu đã có thì xóa, nếu chưa có thì thêm
    if (index !== -1) {
      openDays.splice(index, 1);
    } else {
      openDays.push(day);
    }
    
    // Sắp xếp lại danh sách ngày
    openDays.sort((a, b) => a - b);
    
    // Cập nhật formConfig
    setFormConfig({
      ...formConfig,
      formSchedule: {
        ...updatedSchedule,
        openDays
      }
    });
  };

  // Xử lý thay đổi tiêu đề form
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formConfig) return;
    
    setFormConfig({
      ...formConfig,
      title: e.target.value
    });
  };

  // Biến để theo dõi thời gian cuối cùng toggle nút
  const lastToggleTimeRef = useRef<number>(0);
  
  // Xử lý đóng/mở form với debounce mạnh hơn - hoàn toàn độc lập với nút "Lưu cấu hình"
  const handleToggleFormClosed = () => {
    // Kiểm tra điều kiện để tránh spam
    const now = Date.now();
    const timeSinceLastToggle = now - lastToggleTimeRef.current;
    
    // Nếu đang trong quá trình toggle hoặc thời gian giữa 2 lần nhấn quá ngắn (dưới 1 giây), không làm gì
    if (!formConfig || isToggling || timeSinceLastToggle < 1000) {
      console.log('Bỏ qua yêu cầu toggle do quá nhanh hoặc đang xử lý');
      return;
    }
    
    // Cập nhật thời gian cuối cùng toggle
    lastToggleTimeRef.current = now;
    
    // Đánh dấu đang trong quá trình toggle để tránh nhấn nhiều lần
    setIsToggling(true);
    
    // Tạo trạng thái mới ngược lại với trạng thái hiện tại
    const newIsFormClosed = !formConfig.isFormClosed;
    console.log(`Đang chuyển trạng thái form sang: ${newIsFormClosed ? 'Đóng' : 'Mở'}`);
    
    // Cập nhật trạng thái UI ngay lập tức để người dùng thấy sự thay đổi
    setFormConfig({
      ...formConfig,
      isFormClosed: newIsFormClosed
    });
    
    // Hủy bỏ timeout trước đó nếu có
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }
    
    // Gửi thông báo thay đổi trạng thái form qua API form-status/notify với debounce
    // KHÔNG gửi cấu hình form để đảm bảo tách biệt hoàn toàn với nút "Lưu cấu hình"
    toggleTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Bắt đầu gửi thông báo thay đổi trạng thái form...');
        
        // Lấy thông báo khi đóng form từ cấu hình hoặc dùng thông báo mặc định
        const message = newIsFormClosed ? 
          (formConfig.formSchedule?.closedMessage || 'Form đăng ký hiện đã đóng. Vui lòng quay lại sau.') : 
          '';
        
        // Thêm timeout để tránh chờ vô hạn nếu server không phản hồi
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 giây timeout
        
        // Gửi thông báo thay đổi trạng thái form
        const response = await fetch('/api/form-status/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isOpen: !newIsFormClosed,
            message: message
          }),
          signal: controller.signal
        });
        
        // Xóa timeout vì đã nhận được phản hồi
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`Đã cập nhật trạng thái form thành công: ${newIsFormClosed ? 'Đóng' : 'Mở'}`);
        } else {
          console.error('Lỗi khi cập nhật trạng thái form:', await response.text());
          // Nếu có lỗi, hoàn tác trạng thái UI về trạng thái ban đầu
          setFormConfig({
            ...formConfig,
            isFormClosed: !newIsFormClosed
          });
        }
      } catch (error: any) {
        // Kiểm tra nếu là lỗi timeout hoặc kết nối bị từ chối
        if (error.name === 'AbortError') {
          console.error('Yêu cầu thay đổi trạng thái form đã hết thời gian chờ');
        } else if (error.message && error.message.includes('Failed to fetch')) {
          console.error('Không thể kết nối đến server. Hãy kiểm tra xem server đã khởi động chưa.');
        } else {
          console.error('Lỗi khi gửi thông báo thay đổi trạng thái form:', error);
        }
        
        // Nếu có lỗi, hoàn tác trạng thái UI về trạng thái ban đầu
        setFormConfig({
          ...formConfig,
          isFormClosed: !newIsFormClosed
        });
      } finally {
        // Kết thúc quá trình toggle
        setIsToggling(false);
      }
    }, 300); // Debounce 300ms để tránh gọi API liên tục khi nhấn nhiều lần
  };
  // Xử lý thay đổi cấu hình giới hạn đăng ký
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formConfig || !formConfig.registrationLimit) return;

    const { name, value, type, checked } = e.target;
    
    let updatedRegistrationLimit = {
      ...formConfig.registrationLimit,
      [name]: type === 'checkbox' ? checked : name === 'maxRegistrationsPerDay' ? parseInt(value) : value
    };
    
    // Nếu tắt giới hạn đăng ký, tự động tắt cả giới hạn theo tầng
    if (name === 'enabled' && !checked) {
      updatedRegistrationLimit.byFloor = false;
    }
    
    // Nếu bật giới hạn theo tầng, tự động tạo cấu hình cho các tầng dựa trên danh sách tầng
    if (name === 'byFloor' && checked) {
      // Lấy danh sách tầng từ trường 'floor'
      const floorOptions = formConfig.fields.floor?.options || [];
      
      // Tạo hoặc cập nhật danh sách giới hạn tầng
      const existingFloorLimits = updatedRegistrationLimit.floorLimits || [];
      const existingFloorNames = existingFloorLimits.map(fl => fl.floorName);
      
      // Tạo mảng mới với các tầng hiện tại và thêm các tầng mới
      const updatedFloorLimits = [...existingFloorLimits];
      
      // Thêm các tầng mới vào danh sách giới hạn
      floorOptions.forEach(floorName => {
        if (!existingFloorNames.includes(floorName)) {
          updatedFloorLimits.push({
            floorName,
            maxRegistrations: 3, // Giá trị mặc định
            enabled: true
          });
        }
      });
      
      // Lọc bỏ các tầng không còn tồn tại
      const finalFloorLimits = updatedFloorLimits.filter(fl => floorOptions.includes(fl.floorName));
      
      updatedRegistrationLimit.floorLimits = finalFloorLimits;
    }
    
    setFormConfig({
      ...formConfig,
      registrationLimit: updatedRegistrationLimit
    });
  };

  // Xử lý thay đổi giới hạn theo tầng
  const handleFloorLimitChange = (index: number, field: string, value: any) => {
    if (!formConfig || !formConfig.registrationLimit || !formConfig.registrationLimit.floorLimits) return;
    
    const updatedFloorLimits = [...formConfig.registrationLimit.floorLimits];
    updatedFloorLimits[index] = {
      ...updatedFloorLimits[index],
      [field]: field === 'maxRegistrations' ? parseInt(value) : value
    };
    
    setFormConfig({
      ...formConfig,
      registrationLimit: {
        ...formConfig.registrationLimit,
        floorLimits: updatedFloorLimits
      }
    });
  };

  // Xử lý thay đổi trường form
  const handleFieldChange = (fieldName: string, property: string, value: string | boolean) => {
    if (!formConfig) return;

    setFormConfig({
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [fieldName]: {
          ...formConfig.fields[fieldName],
          [property]: value
        }
      }
    });
  };

  // Xử lý thay đổi tùy chọn của trường form
  const handleOptionsChange = (fieldName: string, options: string[]) => {
    if (!formConfig) return;

    setFormConfig({
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [fieldName]: {
          ...formConfig.fields[fieldName],
          options
        }
      }
    });
  };

  // Thêm tùy chọn mới cho trường form
  const addOption = (fieldName: string) => {
    if (!formConfig) return;

    const field = formConfig.fields[fieldName];
    const options = field.options || [];
    const newOptions = [...options, ''];
    
    // Tạo bản sao của formConfig để cập nhật
    const updatedFormConfig = {
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [fieldName]: {
          ...field,
          options: newOptions
        }
      }
    };
    
    // Nếu đang thêm tầng mới và đã bật giới hạn theo tầng
    if (fieldName === 'floor' && formConfig.registrationLimit?.byFloor && updatedFormConfig.registrationLimit) {
      // Lấy danh sách giới hạn tầng hiện tại
      const existingFloorLimits = [...(formConfig.registrationLimit.floorLimits || [])];
      
      // Thêm tầng mới với giá trị mặc định
      existingFloorLimits.push({
        floorName: '', // Giá trị ban đầu trống, sẽ được cập nhật sau khi người dùng nhập
        maxRegistrations: 3, // Giá trị mặc định
        enabled: true
      });
      
      // Cập nhật danh sách giới hạn tầng
      updatedFormConfig.registrationLimit = {
        enabled: updatedFormConfig.registrationLimit.enabled,
        maxRegistrationsPerDay: updatedFormConfig.registrationLimit.maxRegistrationsPerDay,
        message: updatedFormConfig.registrationLimit.message,
        byFloor: updatedFormConfig.registrationLimit.byFloor || false,
        floorLimits: existingFloorLimits
      };
    }
    
    setFormConfig(updatedFormConfig);
  };

  // Cập nhật tùy chọn cho trường form
  const updateOption = (fieldName: string, index: number, value: string) => {
    if (!formConfig) return;

    const field = formConfig.fields[fieldName];
    const options = [...(field.options || [])];
    options[index] = value;
    
    // Tạo bản sao của formConfig để cập nhật
    const updatedFormConfig = {
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [fieldName]: {
          ...field,
          options
        }
      }
    };
    
    // Nếu đang cập nhật trường floor và đã bật giới hạn theo tầng
    if (fieldName === 'floor' && formConfig.registrationLimit?.byFloor && updatedFormConfig.registrationLimit) {
      // Lấy danh sách giới hạn tầng hiện tại
      const existingFloorLimits = [...(formConfig.registrationLimit.floorLimits || [])];
      const existingFloorNames = existingFloorLimits.map(fl => fl.floorName);
      
      // Kiểm tra xem tầng đã có trong danh sách giới hạn chưa
      if (!existingFloorNames.includes(value)) {
        // Nếu chưa có, thêm vào danh sách giới hạn
        existingFloorLimits.push({
          floorName: value,
          maxRegistrations: 3, // Giá trị mặc định
          enabled: true
        });
        
        // Cập nhật danh sách giới hạn tầng
        updatedFormConfig.registrationLimit = {
          enabled: updatedFormConfig.registrationLimit.enabled,
          maxRegistrationsPerDay: updatedFormConfig.registrationLimit.maxRegistrationsPerDay,
          message: updatedFormConfig.registrationLimit.message,
          byFloor: updatedFormConfig.registrationLimit.byFloor || false,
          floorLimits: existingFloorLimits
        };
      }
    }
    
    setFormConfig(updatedFormConfig);
  };

  // Xóa tùy chọn cho trường form
  const removeOption = (fieldName: string, index: number) => {
    if (!formConfig) return;

    const field = formConfig.fields[fieldName];
    const options = [...(field.options || [])];
    const removedOption = options[index];
    options.splice(index, 1);
    
    // Tạo bản sao của formConfig để cập nhật
    const updatedFormConfig = {
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [fieldName]: {
          ...field,
          options
        }
      }
    };
    
    // Nếu đang xóa option của trường floor và đã bật giới hạn theo tầng
    if (fieldName === 'floor' && formConfig.registrationLimit?.byFloor && removedOption && updatedFormConfig.registrationLimit) {
      // Lấy danh sách giới hạn tầng hiện tại
      const existingFloorLimits = [...(formConfig.registrationLimit.floorLimits || [])];
      
      // Lọc bỏ tầng đã xóa khỏi danh sách giới hạn
      const updatedFloorLimits = existingFloorLimits.filter(fl => fl.floorName !== removedOption);
      
      // Cập nhật danh sách giới hạn tầng
      updatedFormConfig.registrationLimit = {
        enabled: updatedFormConfig.registrationLimit.enabled,
        maxRegistrationsPerDay: updatedFormConfig.registrationLimit.maxRegistrationsPerDay,
        message: updatedFormConfig.registrationLimit.message,
        byFloor: updatedFormConfig.registrationLimit.byFloor || false,
        floorLimits: updatedFloorLimits
      };
    }
    
    setFormConfig(updatedFormConfig);
  };

  // Xóa tùy chọn 
  const handleRemoveOption = (fieldName: string, index: number) => {
    if (!formConfig || !formConfig.fields[fieldName]) return;

    const updatedOptions = [...(formConfig.fields[fieldName].options || [])];
    const removedOption = updatedOptions[index];
    updatedOptions.splice(index, 1);

    // Cập nhật formConfig với options mới
    const updatedFormConfig = {
      ...formConfig,
      fields: {
        ...formConfig.fields,
        [fieldName]: {
          ...formConfig.fields[fieldName],
          options: updatedOptions
        }
      }
    };

    // Nếu đang xóa option của trường floor và đã bật giới hạn theo tầng
    if (fieldName === 'floor' && formConfig.registrationLimit?.byFloor && removedOption && updatedFormConfig.registrationLimit) {
      // Lấy danh sách giới hạn tầng hiện tại
      const existingFloorLimits = [...(formConfig.registrationLimit.floorLimits || [])];
      
      // Lọc bỏ tầng đã xóa khỏi danh sách giới hạn
      const updatedFloorLimits = existingFloorLimits.filter(fl => fl.floorName !== removedOption);
      
      // Cập nhật danh sách giới hạn tầng
      updatedFormConfig.registrationLimit = {
        enabled: updatedFormConfig.registrationLimit.enabled,
        maxRegistrationsPerDay: updatedFormConfig.registrationLimit.maxRegistrationsPerDay,
        message: updatedFormConfig.registrationLimit.message,
        byFloor: updatedFormConfig.registrationLimit.byFloor || false,
        floorLimits: updatedFloorLimits
      };
    }

    setFormConfig(updatedFormConfig);
  };

  // Render thông báo
  const renderMessage = () => {
    if (!message) return null;

    // Chỉ hiển thị thông báo lỗi ở trên đầu
    if (message.type === 'error') {
      return (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      );
    }
    
    // Thông báo thành công sẽ được hiển thị ở phần nút lưu
    return null;
  };

  // Render tab cấu hình chung
  const renderGeneralTab = () => {
    if (!formConfig) return null;

    // Khởi tạo formSchedule nếu chưa có
    const formSchedule = formConfig.formSchedule || {
      enabled: false,
      openTime: '08:00',
      closeTime: '17:00',
      openDays: [1, 2, 3, 4, 5], // Thứ 2 đến thứ 6
      closedMessage: 'Form đăng ký hiện đã đóng. Vui lòng quay lại trong giờ mở cửa.'
    };

    // Danh sách các ngày trong tuần
    const weekdays = [
      { value: 1, label: 'Thứ 2' },
      { value: 2, label: 'Thứ 3' },
      { value: 3, label: 'Thứ 4' },
      { value: 4, label: 'Thứ 5' },
      { value: 5, label: 'Thứ 6' },
      { value: 6, label: 'Thứ 7' },
      { value: 0, label: 'Chủ nhật' }
    ];

    return (
      <div className="tab-content">
        <div className="general-form">
          <div className="form-group">
            <label htmlFor="title">Tiêu đề form</label>
            <input
              type="text"
              id="title"
              value={formConfig.title}
              onChange={handleTitleChange}
              placeholder="Nhập tiêu đề form"
            />
          </div>
          {/* Phần xem trước đã được xóa theo yêu cầu */}
          
          {/* Phần cấu hình mở/đóng form theo giờ */}
          <div className="form-schedule-section">
            <h3>Đặt lịch đóng/mở form</h3>
            
            <div className="form-group">
              <div className="toggle-group">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="scheduleEnabled"
                    name="enabled"
                    checked={formSchedule.enabled}
                    onChange={handleFormScheduleChange}
                  />
                  <span className="slider"></span>
                </label>
                <label htmlFor="scheduleEnabled">Bật tính năng đặt lịch đóng/mở form</label>
              </div>
            </div>
            
            {formSchedule.enabled && (
              <div className="schedule-config">
                <div className="form-group time-group">
                  <div className="time-picker-wrapper">
                    <CustomTimePicker
                      onChange={(value: string) => {
                        if (!formConfig) return;
                        
                        // Tạo một bản sao của formSchedule
                        const updatedSchedule = { ...formSchedule };
                        updatedSchedule.openTime = value || '08:00';
                        
                        // Cập nhật formConfig
                        setFormConfig({
                          ...formConfig,
                          formSchedule: updatedSchedule
                        });
                      }}
                      value={formSchedule.openTime}
                      use24Hours={true}
                      label="Giờ mở"
                    />
                  </div>
                  
                  <div className="time-picker-wrapper">
                    <CustomTimePicker
                      onChange={(value: string) => {
                        if (!formConfig) return;
                        
                        // Tạo một bản sao của formSchedule
                        const updatedSchedule = { ...formSchedule };
                        updatedSchedule.closeTime = value || '17:00';
                        
                        // Cập nhật formConfig
                        setFormConfig({
                          ...formConfig,
                          formSchedule: updatedSchedule
                        });
                      }}
                      value={formSchedule.closeTime}
                      use24Hours={true}
                      label="Giờ đóng"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Ngày mở form</label>
                  <div className="weekday-selector">
                    {weekdays.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        className={`weekday-button ${formSchedule.openDays.includes(day.value) ? 'active' : ''}`}
                        onClick={() => handleOpenDayChange(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="closedMessage">Thông báo khi form đóng</label>
                  <textarea
                    id="closedMessage"
                    name="closedMessage"
                    value={formSchedule.closedMessage}
                    onChange={handleFormScheduleChange}
                    placeholder="Nhập thông báo hiển thị khi form đóng"
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render tab cấu hình giới hạn đăng ký
  const renderLimitsTab = () => {
    if (!formConfig || !formConfig.registrationLimit) return null;

    return (
      <div className="tab-content">
        <div className="limit-section">
          <h3>Cấu hình giới hạn đăng ký</h3>
          
          <div className="form-group">
            <div className="toggle-group">
              <label className="switch">
                <input
                  type="checkbox"
                  id="limitEnabled"
                  name="enabled"
                  checked={formConfig.registrationLimit.enabled}
                  onChange={handleLimitChange}
                />
                <span className="slider"></span>
              </label>
              <label htmlFor="limitEnabled">Bật giới hạn đăng ký</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="maxRegistrationsPerDay">Số lượt đăng ký tối đa mỗi ngày</label>
            <input
              type="number"
              id="maxRegistrationsPerDay"
              name="maxRegistrationsPerDay"
              value={formConfig.registrationLimit.maxRegistrationsPerDay}
              onChange={handleLimitChange}
              min="1"
              disabled={!formConfig.registrationLimit.enabled}
            />
          </div>

          <div className="form-group">
            <label htmlFor="limitMessage">Thông báo khi đạt giới hạn</label>
            <textarea
              id="limitMessage"
              name="message"
              value={formConfig.registrationLimit.message}
              onChange={(e) => handleLimitChange(e as any)}
              placeholder="Nhập thông báo hiển thị khi đạt giới hạn đăng ký"
              disabled={!formConfig.registrationLimit.enabled}
              rows={3}
            />
          </div>
          
          {/* Phần giới hạn theo tầng */}
          <div className="floor-limits-section">
            <div className="form-group">
              <div className="toggle-group">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="byFloor"
                    name="byFloor"
                    checked={formConfig.registrationLimit.byFloor}
                    onChange={handleLimitChange}
                    disabled={!formConfig.registrationLimit.enabled}
                  />
                  <span className="slider"></span>
                </label>
                <label htmlFor="byFloor">Bật giới hạn đăng ký theo tầng</label>
              </div>
            </div>
            
            {/* Chỉ hiển thị phần giới hạn theo tầng khi cả hai checkbox đều được tích */}
          {formConfig.registrationLimit.enabled && formConfig.registrationLimit.byFloor && formConfig.registrationLimit.floorLimits && (
            <div className="floor-limits-container">
              <h4>Giới hạn theo từng tầng</h4>
              
              {formConfig.registrationLimit.floorLimits.length > 0 ? (
                formConfig.registrationLimit.floorLimits.map((floorLimit, index) => (
                  <div key={index} className="floor-limit-item">
                    <div className="floor-limit-header">
                      <span>{floorLimit.floorName}</span>
                      <div className="checkbox-group no-bg">
                        <input
                          type="checkbox"
                          id={`floor-${index}-enabled`}
                          checked={floorLimit.enabled}
                          onChange={(e) => handleFloorLimitChange(index, 'enabled', e.target.checked)}
                        />
                        <label htmlFor={`floor-${index}-enabled`}>Bật giới hạn</label>
                      </div>
                    </div>
                    
                    <div className="floor-limit-body">
                      <div className="form-group">
                        <label htmlFor={`floor-${index}-max`}>Số lượt đăng ký tối đa</label>
                        <input
                          type="number"
                          id={`floor-${index}-max`}
                          value={floorLimit.maxRegistrations}
                          onChange={(e) => handleFloorLimitChange(index, 'maxRegistrations', e.target.value)}
                          min="1"
                          disabled={!floorLimit.enabled}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-floors-message">
                  <p>Chưa có tầng nào được cấu hình. Vui lòng thêm các tầng trong tab "Cấu hình trường" ở trường "Chọn tầng".</p>
                </div>
              )}
            </div>
          )}  
          </div>
          
          {/* Phần xem trước thông báo đã được xóa theo yêu cầu */}
        </div>
      </div>
    );
  };

  // Render tab cấu hình các trường form
  const renderFieldsTab = () => {
    if (!formConfig) return null;

    // Sắp xếp các trường theo thứ tự hiển thị trong form
    const fieldOrder = [
      'name', 'phone', 'email', 'school', 'studentId', 
      'purpose', 'floor', 'contact', 'date', 'time'
    ];
    
    // Lọc các trường theo thứ tự đã định nghĩa
    const sortedFields = fieldOrder
      .filter(fieldName => formConfig.fields[fieldName])
      .map(fieldName => [fieldName, formConfig.fields[fieldName]] as [string, FieldConfig]);

    return (
      <div className="tab-content fields-tab">
        {sortedFields.map(([fieldName, field]) => (
          <div key={fieldName} className="field-config">
            <div className="field-header">
              <h3>{getFieldDisplayName(fieldName)}</h3>
            </div>
            
            <div className="field-body">
              <div className="form-group">
                <label htmlFor={`${fieldName}-label`}>Nhãn hiển thị</label>
                <input
                  type="text"
                  id={`${fieldName}-label`}
                  value={field.label}
                  onChange={(e) => handleFieldChange(fieldName, 'label', e.target.value)}
                  placeholder="Nhập nhãn hiển thị"
                />
              </div>
              
              <div className="form-row">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id={`${fieldName}-required`}
                    checked={field.required}
                    onChange={(e) => handleFieldChange(fieldName, 'required', e.target.checked)}
                  />
                  <label htmlFor={`${fieldName}-required`}>Bắt buộc</label>
                </div>
                
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id={`${fieldName}-enabled`}
                    checked={field.enabled}
                    onChange={(e) => handleFieldChange(fieldName, 'enabled', e.target.checked)}
                  />
                  <label htmlFor={`${fieldName}-enabled`}>Hiển thị</label>
                </div>
              </div>
              
              {/* Hiển thị tùy chọn nếu trường có options */}
              {field.options && (
                <div className="options-container">
                  <label>Tùy chọn</label>
                  {field.options.map((option, index) => (
                    <div key={index} className="option-row">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(fieldName, index, e.target.value)}
                        placeholder={`Tùy chọn ${index + 1}`}
                      />
                      <button 
                        type="button" 
                        className="btn-icon remove"
                        onClick={() => removeOption(fieldName, index)}
                        title="Xóa tùy chọn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn-add-option"
                    onClick={() => addOption(fieldName)}
                  >
                    + Thêm tùy chọn
                  </button>
                </div>
              )}
              
              {/* Hiển thị giá trị mặc định nếu trường có defaultValue */}
              {fieldName === 'time' && (
                <div className="form-group">
                  <label htmlFor={`${fieldName}-default`}>Giá trị mặc định</label>
                  <input
                    type="text"
                    id={`${fieldName}-default`}
                    value={field.defaultValue || ''}
                    onChange={(e) => handleFieldChange(fieldName, 'defaultValue', e.target.value)}
                    placeholder="Nhập giá trị mặc định (ví dụ: 09:00)"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Hàm để hiển thị tên trường dễ đọc hơn
  const getFieldDisplayName = (fieldName: string) => {
    const displayNames: {[key: string]: string} = {
      'name': 'Họ và tên',
      'phone': 'Số điện thoại',
      'email': 'Email',
      'school': 'Trường đại học',
      'studentId': 'Mã số sinh viên',
      'purpose': 'Mục đích',
      'floor': 'Tầng',
      'contact': 'Người liên hệ',
      'date': 'Ngày đăng ký',
      'time': 'Giờ đăng ký'
    };
    
    return displayNames[fieldName] || fieldName;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Modal component cho thông báo */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalContent.title}
        message={modalContent.message}
        type={modalContent.type}
      />
      <div className="form-config-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Cấu hình form đăng ký</h1>
          {formConfig && (
            <div className="switch-container">
              <div className="switch-label">Trạng thái form:</div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={!formConfig.isFormClosed}
                  onChange={handleToggleFormClosed}
                />
                <span className="slider">
                  <span className="slider-text text-on">MỞ</span>
                  <span className="slider-text text-off">ĐÓNG</span>
                </span>
              </label>
              <span className={`status-text ${formConfig.isFormClosed ? 'status-closed' : 'status-open'}`}>
                {formConfig.isFormClosed ? 'Đóng' : 'Mở'}
              </span>
            </div>
          )}
        </div>
        
        {renderMessage()}
        
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => handleTabChange('general')}
          >
            Cấu hình chung
          </div>
          <div 
            className={`tab ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => handleTabChange('fields')}
          >
            Cấu hình trường
          </div>
          <div 
            className={`tab ${activeTab === 'limits' ? 'active' : ''}`}
            onClick={() => handleTabChange('limits')}
          >
            Giới hạn đăng ký
          </div>
        </div>
      
        <div className="tab-container">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'fields' && renderFieldsTab()}
          {activeTab === 'limits' && renderLimitsTab()}
        </div>
      
        <div className="save-button-container">
          {message && message.type === 'success' && (
            <span className="success-message">
              {message.text}
            </span>
          )}
          <button 
            className="btn" 
            onClick={saveFormConfig}
            disabled={saving}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FF9900'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1e2e3e'}
            style={{
              backgroundColor: '#1e2e3e',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              letterSpacing: '0.5px',
              padding: '12px 30px',
              height: '48px',
              fontSize: '1rem',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              minWidth: '160px'
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>
    </div>
  );
}
