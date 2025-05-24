"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './styles.css';
import './switch-toggle.css';
import './delete-button.css';
import './time-picker.css';
import './form-builder.css';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';
import FormBuilder, { FieldType, FormBuilderField, FieldOption } from '../components/FormBuilder';

// Sử dụng FieldOption từ FormBuilder thay vì định nghĩa lại
// interface FieldOption {
//   value: string;
//   label: string;
// }

// Định nghĩa kiểu dữ liệu cho cấu hình form
interface FieldConfig {
  label: string;
  required: boolean;
  enabled: boolean;
  options?: (string | FieldOption)[];
  defaultValue?: string;
  fieldType?: string;
  placeholder?: string;
  isCustom?: boolean;
  allowDateChange?: boolean; // Thêm thuộc tính cho phép thay đổi ngày
  dateFormat?: string; // Định dạng hiển thị ngày (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd)
  allowTimeChange?: boolean; // Thêm thuộc tính cho phép thay đổi thời gian
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
  isFormClosed?: boolean;
}

export default function FormConfigPage() {
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'fields' | 'limits'>('general');
  
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
        
        // Hàm để lấy giá trị từ option (hỗ trợ cả chuỗi và FieldOption)
        const getOptionValue = (option: string | FieldOption): string => {
          return typeof option === 'string' ? option : option.value;
        };

        // Chuyển đổi floorOptions thành mảng chuỗi
        const floorOptionValues = floorOptions.map(option => getOptionValue(option));
        
        // Thêm các tầng mới vào danh sách giới hạn
        floorOptionValues.forEach(floorName => {
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
        const finalFloorLimits = updatedFloorLimits.filter(fl => floorOptionValues.includes(fl.floorName));
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

  // Tải cấu hình form từ API
  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        // Lấy cấu hình form từ API form-config (chỉ lấy dữ liệu từ database)
        const configResponse = await fetch('/api/form-config');
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          
          // Đảm bảo các trường có thuộc tính options (nếu chưa có)
          const updatedConfig = { ...configData };
          
          // Đảm bảo các trường có thuộc tính options là một mảng (nếu chưa có)
          Object.keys(updatedConfig.fields).forEach(fieldName => {
            if (['floor', 'department', 'purpose', 'contact', 'school'].includes(fieldName)) {
              if (!updatedConfig.fields[fieldName].options) {
                updatedConfig.fields[fieldName].options = [];
              }
            }
          });
          
          setFormConfig(updatedConfig);
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

    fetchFormConfig();
  }, []);

  // Lưu cấu hình form
  const saveFormConfig = async () => {
    if (!formConfig) return;

    setSaving(true);
    try {
      console.log('Saving form config:', JSON.stringify(formConfig, null, 2));
      
      // Đảm bảo các trường tùy chỉnh có cấu trúc đúng
      const fieldsToSave = { ...formConfig.fields };
      
      // Chuyển đổi các options từ mảng chuỗi sang mảng đối tượng nếu cần
      Object.keys(fieldsToSave).forEach(fieldName => {
        const field = fieldsToSave[fieldName];
        if (field.fieldType === 'dropdown' && Array.isArray(field.options)) {
          field.options = field.options.map(option => {
            if (typeof option === 'string') {
              return { value: option, label: option };
            }
            return option;
          });
        }
      });
      
      // Gửi cấu hình form đến server
      const dataToSend = {
        ...formConfig,
        fields: fieldsToSave
      };
      
      console.log('Sending data to server:', JSON.stringify(dataToSend, null, 2));
      
      const response = await fetch('/api/form-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (response.ok) {
        // Tải lại dữ liệu từ server để đảm bảo giao diện được cập nhật đúng
        try {
          const refreshResponse = await fetch('/api/form-config');
          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            console.log('Refreshed data from server:', refreshedData);
            setFormConfig(refreshedData);
            
            // Làm mới trang để hiển thị các trường mới
            // Chúng ta không cần setFields vì fields được tạo lại mỗi khi renderFieldsTab được gọi
            // Tạo một tab mới và quay lại tab hiện tại để làm mới giao diện
            const currentTab = activeTab;
            setActiveTab('general');
            setTimeout(() => {
              setActiveTab(currentTab);
            }, 50);
          }
        } catch (refreshError) {
          console.error('Lỗi khi tải lại dữ liệu:', refreshError);
        }
        
        // Sử dụng toast thay vì modal để hiển thị thông báo thành công
        toast.success('Đã lưu cấu hình form thành công', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        setMessage({
          text: responseData.message || 'Lỗi khi lưu cấu hình form',
          type: 'error'
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
  
  // Xử lý thay đổi tiêu đề form
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formConfig) return;
    
    setFormConfig({
      ...formConfig,
      title: e.target.value
    });
  };

  // Xử lý thay đổi trạng thái đóng/mở form
  const handleFormStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formConfig) return;
    
    setFormConfig({
      ...formConfig,
      isFormClosed: e.target.checked
    });
  };

  // Xử lý thay đổi cấu hình giới hạn đăng ký
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formConfig) return;
    
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const isCheckbox = type === 'checkbox';
    
    // Tạo một bản sao của registrationLimit hoặc tạo mới nếu chưa có
    const updatedLimit = formConfig.registrationLimit ? { ...formConfig.registrationLimit } : {
      enabled: false,
      maxRegistrationsPerDay: 50,
      message: 'Đã đạt giới hạn đăng ký cho ngày hôm nay. Vui lòng quay lại vào ngày mai.',
      byFloor: false,
      floorLimits: []
    };
    
    // Cập nhật giá trị tương ứng
    if (name === 'enabled' || name === 'byFloor') {
      (updatedLimit as any)[name] = checked;
    } else if (name === 'maxRegistrationsPerDay') {
      updatedLimit.maxRegistrationsPerDay = parseInt(value, 10) || 0;
    } else if (name === 'message') {
      updatedLimit.message = value;
    }
    
    // Cập nhật formConfig
    setFormConfig({
      ...formConfig,
      registrationLimit: updatedLimit
    });
  };

  // Xử lý thay đổi giới hạn theo tầng
  const handleFloorLimitChange = (index: number, field: string, value: any) => {
    if (!formConfig || !formConfig.registrationLimit || !formConfig.registrationLimit.floorLimits) return;
    
    const updatedFloorLimits = [...formConfig.registrationLimit.floorLimits];
    
    if (field === 'enabled') {
      updatedFloorLimits[index].enabled = value;
    } else if (field === 'maxRegistrations') {
      updatedFloorLimits[index].maxRegistrations = parseInt(value, 10) || 0;
    }
    
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
  const handleOptionsChange = (fieldName: string, options: (string | FieldOption)[]) => {
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
    
    // Lấy danh sách tùy chọn hiện tại hoặc tạo mới nếu chưa có
    const currentOptions = formConfig.fields[fieldName]?.options || [];
    
    // Tạo một tùy chọn mới với tên mặc định
    const optionNumber = currentOptions.length + 1;
    const newOption: FieldOption = {
      value: `option${optionNumber}`,
      label: `Tùy chọn ${optionNumber}`
    };
    
    // Cập nhật danh sách tùy chọn
    handleOptionsChange(fieldName, [...currentOptions, newOption]);
  };

  // Cập nhật tùy chọn cho trường form
  const updateOption = (fieldName: string, index: number, value: string, isLabel = true) => {
    if (!formConfig) return;
    
    // Lấy danh sách tùy chọn hiện tại
    const currentOptions = [...(formConfig.fields[fieldName]?.options || [])];
    
    // Cập nhật giá trị tùy chọn tại vị trí index
    const currentOption = currentOptions[index];
    if (typeof currentOption === 'string') {
      // Nếu là chuỗi, chuyển đổi thành đối tượng FieldOption
      currentOptions[index] = {
        value: isLabel ? `option${index + 1}` : value,
        label: isLabel ? value : currentOption
      };
    } else {
      // Nếu là đối tượng FieldOption, cập nhật thuộc tính phù hợp
      currentOptions[index] = {
        ...currentOption,
        [isLabel ? 'label' : 'value']: value
      };
    }
    
    // Cập nhật danh sách tùy chọn
    handleOptionsChange(fieldName, currentOptions);
  };

  // Xóa tùy chọn cho trường form
  const removeOption = (fieldName: string, index: number) => {
    if (!formConfig) return;
    
    // Lấy danh sách tùy chọn hiện tại
    const currentOptions = [...(formConfig.fields[fieldName]?.options || [])];
    
    // Xóa tùy chọn tại vị trí index
    currentOptions.splice(index, 1);
    
    // Cập nhật danh sách tùy chọn
    handleOptionsChange(fieldName, currentOptions);
  };

  // Xử lý xóa tùy chọn
  const handleRemoveOption = (fieldName: string, index: number) => {
    // Xóa tùy chọn trực tiếp không cần xác nhận
    removeOption(fieldName, index);
  };

  // Render thông báo
  const renderMessage = () => {
    if (!message) return null;
    
    return (
      <div className={`message ${message.type}`}>
        <p>{message.text}</p>
        <button onClick={() => setMessage(null)} className="close-button">
          &times;
        </button>
      </div>
    );
  };

  // Render tab cấu hình chung
  const renderGeneralTab = () => {
    if (!formConfig) return null;

    return (
      <div className="tab-content">
        <div className="general-section">
          <h3>Cấu hình chung</h3>
          
          <div className="form-group">
            <label htmlFor="title">Tiêu đề form</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formConfig.title}
              onChange={handleTitleChange}
              placeholder="Nhập tiêu đề form"
            />
          </div>
          
          <div className="form-group">
            <div className="toggle-group">
              <label className="switch">
                <input
                  type="checkbox"
                  id="isFormClosed"
                  name="isFormClosed"
                  checked={formConfig.isFormClosed || false}
                  onChange={handleFormStatusChange}
                />
                <span className="slider"></span>
              </label>
              <label htmlFor="isFormClosed">Đóng form (form sẽ không nhận đăng ký mới)</label>
            </div>
            <div className="alert alert-info">
              <p><strong>Thông báo:</strong> Chức năng đặt lịch đóng/mở form đã bị xóa. Form sẽ luôn được mở trừ khi bạn đóng thủ công.</p>
            </div>
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
              <label htmlFor="limitEnabled">Bật giới hạn số lượng đăng ký mỗi ngày</label>
            </div>
          </div>
          
          {formConfig.registrationLimit.enabled && (
            <div className="limit-config">
              <div className="form-group">
                <label htmlFor="maxRegistrationsPerDay">Số lượng đăng ký tối đa mỗi ngày</label>
                <input
                  type="number"
                  id="maxRegistrationsPerDay"
                  name="maxRegistrationsPerDay"
                  value={formConfig.registrationLimit.maxRegistrationsPerDay}
                  onChange={handleLimitChange}
                  min="1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="limitMessage">Thông báo khi đạt giới hạn</label>
                <textarea
                  id="limitMessage"
                  name="message"
                  value={formConfig.registrationLimit.message}
                  onChange={handleLimitChange}
                  placeholder="Nhập thông báo hiển thị khi đạt giới hạn đăng ký"
                  rows={4}
                />
              </div>
              
              <div className="form-group">
                <div className="toggle-group">
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="byFloor"
                      name="byFloor"
                      checked={formConfig.registrationLimit.byFloor}
                      onChange={handleLimitChange}
                    />
                    <span className="slider"></span>
                  </label>
                  <label htmlFor="byFloor">Giới hạn theo từng tầng</label>
                </div>
              </div>
              
              {formConfig.registrationLimit.byFloor && formConfig.registrationLimit.floorLimits && (
                <div className="floor-limits">
                  <h4>Giới hạn đăng ký theo tầng</h4>
                  
                  <div className="floor-limits-table">
                    <div className="floor-limits-header">
                      <div className="floor-name">Tầng</div>
                      <div className="floor-limit">Giới hạn</div>
                      <div className="floor-enabled">Bật/Tắt</div>
                    </div>
                    
                    {formConfig.registrationLimit.floorLimits.map((floorLimit, index) => (
                      <div key={floorLimit.floorName} className="floor-limits-row">
                        <div className="floor-name">{floorLimit.floorName}</div>
                        <div className="floor-limit">
                          <input
                            type="number"
                            value={floorLimit.maxRegistrations}
                            onChange={(e) => handleFloorLimitChange(index, 'maxRegistrations', e.target.value)}
                            min="1"
                          />
                        </div>
                        <div className="floor-enabled">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={floorLimit.enabled}
                              onChange={(e) => handleFloorLimitChange(index, 'enabled', e.target.checked)}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render tab cấu hình các trường form
  const renderFieldsTab = () => {
    if (!formConfig) return null;

    // Danh sách các trường form
    let fields = Object.keys(formConfig.fields).map(fieldName => ({
      name: fieldName,
      ...formConfig.fields[fieldName]
    }));
    
    // Di chuyển trường contact xuống dưới cùng
    const contactIndex = fields.findIndex(field => field.name === 'contact');
    if (contactIndex !== -1) {
      const contactField = fields.splice(contactIndex, 1)[0];
      fields.push(contactField);
    }

    // Xử lý lưu form builder fields
    const handleSaveFormBuilderFields = (builderFields: FormBuilderField[]) => {
      if (!formConfig) return;
      
      console.log('Form builder fields:', JSON.stringify(builderFields, null, 2));
      
      // Tạo một bản sao của formConfig để làm việc
      const updatedFormConfig = { ...formConfig };
      const updatedFields = { ...updatedFormConfig.fields };
      
      // Xóa các trường tùy chỉnh hiện tại
      Object.keys(updatedFields).forEach(key => {
        if (updatedFields[key].isCustom) {
          console.log(`Xóa trường tùy chỉnh hiện tại: ${key}`);
          delete updatedFields[key];
        }
      });
      
      console.log('Sau khi xóa các trường tùy chỉnh:', Object.keys(updatedFields));
      
      // Thêm các trường mới từ form builder
      if (builderFields && builderFields.length > 0) {
        builderFields.forEach(field => {
          console.log(`Đang xử lý trường: ${field.label} (${field.fieldName})`);
          
          // Đảm bảo fieldName không trống và hợp lệ
          let fieldName = field.fieldName;
          if (!fieldName || fieldName.trim() === '') {
            fieldName = createFieldName(field.label);
            console.log(`Tạo fieldName mới: ${fieldName}`);
          }
          
          // Đảm bảo fieldName là chuỗi hợp lệ cho key của object
          const safeFieldName = fieldName.replace(/\s+/g, '_').toLowerCase();
          
          // Chuyển đổi options nếu cần
          let options = undefined;
          if (field.type === 'dropdown' && Array.isArray(field.options)) {
            options = field.options.map(option => {
              if (typeof option === 'string') {
                return { value: option, label: option };
              }
              return option;
            });
          }
          
          // Thêm trường mới vào danh sách
          updatedFields[safeFieldName] = {
            label: field.label,
            required: field.required,
            enabled: field.enabled,
            defaultValue: field.defaultValue || '',
            fieldType: field.type,
            placeholder: field.placeholder || '',
            isCustom: true,
            options: options
          };
          
          // Thêm thuộc tính allowDateChange và dateFormat cho trường ngày
          if (field.type === 'date') {
            // Đảm bảo lưu đúng giá trị boolean vào database
            updatedFields[safeFieldName].allowDateChange = field.allowDateChange === true;
            // Lưu định dạng ngày
            updatedFields[safeFieldName].dateFormat = field.dateFormat || 'dd/mm/yyyy';
            console.log(`Lưu allowDateChange = ${field.allowDateChange === true}, dateFormat = ${field.dateFormat || 'dd/mm/yyyy'} cho trường ${safeFieldName}`);
          }
          
          // Thêm thuộc tính allowTimeChange và timeFormat cho trường thời gian
          if (field.type === 'time') {
            // Đảm bảo lưu đúng giá trị boolean vào database
            updatedFields[safeFieldName].allowTimeChange = field.allowTimeChange === true;
            // Lưu định dạng thời gian
            updatedFields[safeFieldName].timeFormat = field.timeFormat || '24h';
            console.log(`Lưu allowTimeChange = ${field.allowTimeChange === true}, timeFormat = ${field.timeFormat || '24h'} cho trường ${safeFieldName}`);
          }
          
          console.log(`Đã thêm trường mới: ${safeFieldName}`);
        });
      }
      
      console.log('Updated fields:', Object.keys(updatedFields));
      console.log('Chi tiết fields:', JSON.stringify(updatedFields, null, 2));
      
      // Cập nhật formConfig với các trường mới
      updatedFormConfig.fields = updatedFields;
      
      // Gửi dữ liệu trực tiếp đến server
      console.log('Gửi dữ liệu trực tiếp đến server');
      fetch('/api/form-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFormConfig),
      })
      .then(response => response.json())
      .then(data => {
        console.log('Server response:', data);
        if (data.success) {
          // Cập nhật state với dữ liệu mới
          setFormConfig(updatedFormConfig);
          
          // Làm mới giao diện
          const currentTab = activeTab;
          setActiveTab('general');
          setTimeout(() => {
            setActiveTab(currentTab);
          }, 50);
          
          // Đã vô hiệu hóa toast thông báo khi tạo trường mới theo yêu cầu của người dùng
          // toast.success('Đã lưu các trường tùy chỉnh vào cơ sở dữ liệu', {
          //   position: "top-right",
          //   autoClose: 3000,
          //   hideProgressBar: false,
          //   closeOnClick: true,
          //   pauseOnHover: true,
          //   draggable: true,
          // });
        } else {
          toast.error('Lỗi khi lưu trường mới: ' + (data.message || 'Lỗi không xác định'), {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      })
      .catch(error => {
        console.error('Lỗi khi lưu trường mới:', error);
        toast.error('Lỗi khi lưu trường mới: ' + error.message, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      });
    };
    
    // Hàm tạo fieldName từ label
    const createFieldName = (label: string): string => {
      return label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
    };
    
    // Hàm xử lý xóa trường
    const handleDeleteField = (fieldName: string) => {
      if (!formConfig) return;
      
      // Xác nhận trước khi xóa
      if (window.confirm(`Bạn có chắc chắn muốn xóa trường này không?`)) {
        // Tạo bản sao của fields hiện tại
        const updatedFields = { ...formConfig.fields };
        
        // Xóa trường
        delete updatedFields[fieldName];
        
        // Cập nhật formConfig
        setFormConfig({
          ...formConfig,
          fields: updatedFields
        });
        
        // Lưu cấu hình form vào database
        setTimeout(() => {
          saveFormConfig();
        }, 100);
        
        // Hiển thị thông báo
        toast.success('Đã xóa trường thành công', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    };

    return (
      <div className="tab-content">
        <div className="fields-section">
          <h3>Cấu hình các trường form</h3>
          
          {/* Form Builder */}
          <div className="form-builder-section">
            {/* Truyền các trường tùy chỉnh hiện tại vào FormBuilder */}
            <FormBuilder 
              onSave={handleSaveFormBuilderFields} 
              initialFields={fields.filter(field => field.isCustom).map(field => {
                // Chuyển đổi options để đảm bảo kiểu dữ liệu phù hợp
                let convertedOptions: FieldOption[] | undefined = undefined;
                if (field.fieldType === 'dropdown' && Array.isArray(field.options)) {
                  convertedOptions = field.options.map(opt => {
                    if (typeof opt === 'string') {
                      return { value: opt, label: opt };
                    }
                    return opt as FieldOption;
                  });
                }
                
                // Tạo đối tượng field cơ bản
                const formBuilderField: FormBuilderField = {
                  id: field.name, // Sử dụng name làm id
                  fieldName: field.name,
                  type: field.fieldType as FieldType,
                  label: field.label,
                  placeholder: field.placeholder || '',
                  required: field.required,
                  enabled: field.enabled,
                  defaultValue: field.defaultValue,
                  isCustom: true,
                  options: convertedOptions
                };
                
                // Thêm thuộc tính allowDateChange và dateFormat cho trường ngày
                if (field.fieldType === 'date') {
                  formBuilderField.allowDateChange = field.allowDateChange;
                  formBuilderField.dateFormat = field.dateFormat || 'dd/mm/yyyy';
                  console.log(`Truyền allowDateChange = ${field.allowDateChange}, dateFormat = ${field.dateFormat || 'dd/mm/yyyy'} cho trường ${field.name}`);
                }
                
                // Thêm thuộc tính allowTimeChange và timeFormat cho trường thời gian
                if (field.fieldType === 'time') {
                  formBuilderField.allowTimeChange = field.allowTimeChange;
                  formBuilderField.timeFormat = field.timeFormat || '24h';
                  console.log(`Truyền allowTimeChange = ${field.allowTimeChange}, timeFormat = ${field.timeFormat || '24h'} cho trường ${field.name}`);
                }
                
                return formBuilderField;
              })}
            />
          </div>
          
          <h4 className="form-preview-title">Xem trước form</h4>
          
          <div className="form-preview">
            <div className="preview-container">
              <h3 className="form-title">{formConfig?.title || 'Form đăng ký'}</h3>
              
              {fields.map(field => {
                if (!field.enabled) return null;
                
                return (
                  <div key={field.name} className="preview-field">
                    {field.fieldType === 'text' && (
                      <input 
                        type="text" 
                        placeholder={field.label}
                        className="preview-input"
                        readOnly
                      />
                    )}
                    
                    {field.fieldType === 'textarea' && (
                      <textarea 
                        placeholder={field.label}
                        className="preview-textarea"
                        readOnly
                      ></textarea>
                    )}
                    
                    {field.fieldType === 'dropdown' && (
                      <div className="dropdown-container">
                        <select className="preview-select" disabled>
                          <option value="">{field.label}</option>
                          {Array.isArray(field.options) && field.options.map((option, index) => (
                            <option key={index} value={typeof option === 'string' ? option : option.value}>
                              {typeof option === 'string' ? option : option.label}
                            </option>
                          ))}
                        </select>
                        <div className="dropdown-arrow">▼</div>
                      </div>
                    )}
                    
                    {field.fieldType === 'date' && (
                      <input 
                        type="text" 
                        placeholder={`${field.label} (dd/mm/yyyy)`}
                        className={`preview-input preview-date ${!field.allowDateChange ? 'disabled-input' : ''}`}
                        defaultValue={field.defaultValue || ''}
                        readOnly={!field.allowDateChange}
                        disabled={!field.allowDateChange}
                      />
                    )}
                    
                    {field.fieldType === 'time' && (
                      <input 
                        type="text" 
                        placeholder={`${field.label} (HH:MM)`}
                        className="preview-input preview-time"
                        readOnly
                      />
                    )}
                  </div>
                );
              })}
              
              <div className="required-note">
                * là thông tin bắt buộc phải điền
              </div>
              
              <div className="preview-actions">
                <button className="preview-submit-button" disabled>Gửi đăng ký</button>
              </div>
            </div>
          </div>
          
          <style jsx>{`
            .form-preview-title {
              margin-top: 30px;
              margin-bottom: 15px;
              font-size: 18px;
              font-weight: 600;
            }
            
            .form-preview {
              background-color: #f5f5f5;
              border: 1px solid #e0e0e0;
              padding: 20px;
              margin-bottom: 30px;
            }
            
            .preview-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .form-title {
              text-align: center;
              margin-bottom: 25px;
              color: #333;
              font-size: 24px;
              font-weight: 600;
            }
            
            .preview-field {
              margin-bottom: 15px;
            }
            
            .preview-input, .preview-textarea, .preview-select {
              width: 100%;
              padding: 10px 12px;
              border: 1px solid #ccc;
              border-radius: 4px;
              background-color: #fff;
              font-size: 16px;
            }
            
            .disabled-input {
              background-color: #f5f5f5;
              color: #666;
              cursor: not-allowed;
              border: 1px solid #ddd;
            }
            
            .preview-textarea {
              min-height: 100px;
              resize: vertical;
            }
            
            .dropdown-container {
              position: relative;
            }
            
            .dropdown-arrow {
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
              font-size: 12px;
              color: #666;
              pointer-events: none;
            }
            
            .required-note {
              font-size: 14px;
              color: #666;
              margin: 20px 0;
              font-style: italic;
            }
            
            .preview-actions {
              margin-top: 20px;
              text-align: center;
            }
            
            .preview-submit-button {
              background-color: #1a2e3b;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 4px;
              font-size: 16px;
              width: 100%;
              cursor: not-allowed;
            }
          `}</style>
        </div>
      </div>
    );
  };

  // Hàm để hiển thị tên trường dễ đọc hơn
  const getFieldDisplayName = (fieldName: string) => {
    const displayNames: { [key: string]: string } = {
      name: 'Họ và tên',
      email: 'Email',
      phone: 'Số điện thoại',
      floor: 'Tầng',
      department: 'Phòng ban',
      purpose: 'Mục đích đến',
      note: 'Ghi chú'
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
      <div className="form-config-page">
        <h1>Cấu hình form đăng ký</h1>
        
        {renderMessage()}
        
        <div className="tabs">
          <div className="tab-buttons">
            <button
              className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => handleTabChange('general')}
            >
              Cấu hình chung
            </button>
            <button
              className={`tab-button ${activeTab === 'fields' ? 'active' : ''}`}
              onClick={() => handleTabChange('fields')}
            >
              Cấu hình trường
            </button>
            <button
              className={`tab-button ${activeTab === 'limits' ? 'active' : ''}`}
              onClick={() => handleTabChange('limits')}
            >
              Giới hạn đăng ký
            </button>
          </div>
          
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'fields' && renderFieldsTab()}
          {activeTab === 'limits' && renderLimitsTab()}
          
          <div className="form-actions">
            {activeTab !== 'fields' && (
              <button
                type="button"
                className="save-button"
                onClick={saveFormConfig}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalContent.title}
        message={modalContent.message}
        type={modalContent.type}
      />
    </div>
  );
}
