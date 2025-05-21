"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './styles.css';

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

  // Tải cấu hình form từ API
  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const response = await fetch('/api/form-config');
        if (response.ok) {
          const data = await response.json();
          setFormConfig(data);
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
      const response = await fetch('/api/form-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formConfig)
      });

      if (response.ok) {
        setMessage({
          text: 'Cấu hình form đã được lưu thành công',
          type: 'success'
        });
        
        // Tự động ẩn thông báo sau 3 giây
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        setMessage({
          text: 'Không thể lưu cấu hình form',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Lỗi khi lưu cấu hình form:', error);
      setMessage({
        text: 'Lỗi khi lưu cấu hình form',
        type: 'error'
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

  // Xử lý thay đổi cấu hình giới hạn đăng ký
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formConfig || !formConfig.registrationLimit) return;

    const { name, value, type, checked } = e.target;
    let updatedRegistrationLimit = {
      ...formConfig.registrationLimit,
      [name]: type === 'checkbox' ? checked : name === 'maxRegistrationsPerDay' ? parseInt(value) : value
    };
    
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
          <div className="form-preview">
            <h3>Xem trước</h3>
            <div className="preview-container">
              <h2>{formConfig.title}</h2>
              <div className="preview-info">
                Đây là tiêu đề sẽ hiển thị trên trang đăng ký của khách hàng
              </div>
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
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="limitEnabled"
                name="enabled"
                checked={formConfig.registrationLimit.enabled}
                onChange={handleLimitChange}
              />
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
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="byFloor"
                  name="byFloor"
                  checked={formConfig.registrationLimit.byFloor}
                  onChange={handleLimitChange}
                  disabled={!formConfig.registrationLimit.enabled}
                />
                <label htmlFor="byFloor">Bật giới hạn đăng ký theo tầng</label>
              </div>
            </div>
            
            {formConfig.registrationLimit.enabled && formConfig.registrationLimit.byFloor && formConfig.registrationLimit.floorLimits && (
              <div className="floor-limits-container">
                <h4>Giới hạn theo từng tầng</h4>
                
                {formConfig.registrationLimit.floorLimits.length > 0 ? (
                  formConfig.registrationLimit.floorLimits.map((floorLimit, index) => (
                    <div key={index} className="floor-limit-item">
                      <div className="floor-limit-header">
                        <span>{floorLimit.floorName}</span>
                        <div className="checkbox-group">
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
      <div className="form-header">
        <h1>Cấu hình form đăng ký</h1>
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
          className="btn-save" 
          onClick={saveFormConfig}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
    </div>
  );
}
