"use client";

import React, { useState, useEffect } from 'react';
import '../form/form-builder.css';
import './form-builder-custom.css';
import ReactModal from 'react-modal';

// Định nghĩa các loại trường
export type FieldType = 'text' | 'textarea' | 'dropdown' | 'date' | 'time' | 'email' | 'number';

// Cấu trúc của một tùy chọn cho dropdown
export interface FieldOption {
  value: string;
  label: string;
}

// Cấu trúc của một trường form
export interface FormBuilderField {
  id: string;
  fieldName: string; // Tên trường dùng trong database
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  defaultValue?: string;
  isCustom: boolean; // Đánh dấu trường tùy chỉnh
  options?: FieldOption[]; // Chỉ dùng cho dropdown
  allowDateChange?: boolean; // Chỉ dùng cho trường ngày
  dateFormat?: string; // Định dạng hiển thị ngày (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd)
  allowTimeChange?: boolean; // Chỉ dùng cho trường thời gian
  timeFormat?: string; // Định dạng hiển thị thời gian (24h, 12h)
}

interface FormBuilderProps {
  onSave: (fields: FormBuilderField[]) => void;
  initialFields?: FormBuilderField[];
}

export default function FormBuilder({ onSave, initialFields = [] }: FormBuilderProps) {
  const [fields, setFields] = useState<FormBuilderField[]>(initialFields);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [fieldLabel, setFieldLabel] = useState<string>('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState<string>('');
  const [fieldDefaultValue, setFieldDefaultValue] = useState<string>('');
  const [fieldRequired, setFieldRequired] = useState<boolean>(false);
  const [fieldEnabled, setFieldEnabled] = useState<boolean>(true);
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [allowDateChange, setAllowDateChange] = useState<boolean>(false);
  const [dateFormat, setDateFormat] = useState<string>('dd/mm/yyyy');
  const [allowTimeChange, setAllowTimeChange] = useState<boolean>(false);
  const [timeFormat, setTimeFormat] = useState<string>('24h');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [fieldToDeleteIndex, setFieldToDeleteIndex] = useState<number>(-1);
  
  // Đảm bảo app element được đặt đúng cho ReactModal
  useEffect(() => {
    ReactModal.setAppElement(document.body);
  }, []);

  // Tạo ID ngẫu nhiên cho trường mới
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Tạo tên trường từ label
  const createFieldName = (label: string): string => {
    // Chuyển đổi label thành fieldName: loại bỏ dấu, thay khoảng trắng bằng gạch dưới, và chuyển thành chữ thường
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  };

  // Thêm trường mới vào form
  const addField = (type: FieldType) => {
    setFieldType(type);
    setFieldLabel('');
    
    // Đặt placeholder trống khi tạo mới trường
    setFieldPlaceholder('');
    
    // Đặt giá trị mặc định phù hợp với từng loại trường
    let defaultValue = '';
    if (type === 'date') {
      // Để trống giá trị mặc định cho trường ngày
      defaultValue = '';
    } else if (type === 'time') {
      defaultValue = '';
    }
    setFieldDefaultValue(defaultValue);
    
    // Đặt các giá trị khác
    setFieldRequired(false);
    setFieldEnabled(true);
    setAllowDateChange(false); // Mặc định không cho phép thay đổi ngày
    setAllowTimeChange(false); // Mặc định không cho phép thay đổi thời gian
    setTimeFormat('24h'); // Mặc định sử dụng định dạng 24h
    
    // Không tạo sẵn các tùy chọn cho dropdown, để người dùng tự tạo
    setFieldOptions([]);
    
    setIsEditing(true);
    setEditingIndex(-1);
  };

  // Lưu trường hiện tại vào danh sách
  const saveField = () => {
    if (!fieldLabel) return;
    
    // Tạo fieldName từ label và đảm bảo nó là duy nhất
    let fieldName = createFieldName(fieldLabel);
    
    // Kiểm tra xem fieldName đã tồn tại chưa
    const existingFieldNames = fields.map(f => f.fieldName);
    if (existingFieldNames.includes(fieldName) && (editingIndex === -1 || fields[editingIndex].fieldName !== fieldName)) {
      // Nếu fieldName đã tồn tại, thêm số vào cuối
      let counter = 1;
      while (existingFieldNames.includes(`${fieldName}_${counter}`)) {
        counter++;
      }
      fieldName = `${fieldName}_${counter}`;
    }
    
    console.log('Saving field with fieldName:', fieldName);
    
    // Tạo trường mới với các thuộc tính cơ bản
    const newField: FormBuilderField = {
      id: generateId(),
      fieldName,
      type: fieldType,
      label: fieldLabel,
      // Xử lý placeholder để tránh thêm nhiều dấu *
      // 1. Lấy placeholder hoặc label nếu không có placeholder
      // 2. Loại bỏ các dấu * ở cuối
      // 3. Thêm dấu * nếu trường bắt buộc
      placeholder: (() => {
        // Lấy giá trị placeholder hoặc label
        let placeholderValue = fieldPlaceholder || fieldLabel;
        
        // Loại bỏ các dấu * ở cuối
        placeholderValue = placeholderValue.replace(/\s*\*+\s*$/, '');
        
        // Thêm dấu * nếu trường bắt buộc
        return fieldRequired ? `${placeholderValue} *` : placeholderValue;
      })(),
      required: fieldRequired,
      enabled: fieldEnabled,
      defaultValue: fieldDefaultValue,
      isCustom: true,
      options: fieldType === 'dropdown' ? fieldOptions : undefined
    };
    
    // Thêm thuộc tính cho trường ngày
    if (fieldType === 'date') {
      // Lưu giá trị boolean rõ ràng vào trường
      newField.allowDateChange = allowDateChange === true;
      // Lưu định dạng ngày
      newField.dateFormat = dateFormat;
      console.log(`Đặt allowDateChange = ${allowDateChange === true}, dateFormat = ${dateFormat} cho trường ngày ${fieldName}`);
    }
    
    // Thêm thuộc tính cho trường thời gian
    if (fieldType === 'time') {
      // Lưu giá trị boolean rõ ràng vào trường
      newField.allowTimeChange = allowTimeChange === true;
      // Lưu định dạng thời gian
      newField.timeFormat = timeFormat;
      console.log(`Đặt allowTimeChange = ${allowTimeChange === true}, timeFormat = ${timeFormat} cho trường thời gian ${fieldName}`);
    }

    console.log('New field data:', newField);

    if (isEditing && editingIndex >= 0) {
      // Cập nhật trường đã tồn tại
      const updatedFields = [...fields];
      updatedFields[editingIndex] = newField;
      setFields(updatedFields);
    } else {
      // Thêm trường mới
      setFields([...fields, newField]);
    }

    // Gọi onSave để cập nhật ngay lập tức
    setTimeout(() => {
      const updatedFields = isEditing && editingIndex >= 0 ? 
        [...fields.slice(0, editingIndex), newField, ...fields.slice(editingIndex + 1)] : 
        [...fields, newField];
      console.log('Calling onSave with fields:', updatedFields);
      onSave(updatedFields);
    }, 0);

    // Reset trạng thái
    setIsEditing(false);
    setEditingIndex(-1);
  };

  // Hủy thao tác chỉnh sửa
  const cancelEdit = () => {
    setIsEditing(false);
    setEditingIndex(-1);
  };

  // Chỉnh sửa trường đã tồn tại
  const editField = (index: number) => {
    const field = fields[index];
    setFieldLabel(field.label);
    setFieldPlaceholder(field.placeholder || ''); // Sử dụng chuỗi rỗng nếu placeholder là undefined
    setFieldDefaultValue(field.defaultValue || '');
    setFieldRequired(field.required);
    setFieldEnabled(field.enabled);
    setFieldType(field.type);
    setFieldOptions(field.options || []);
    
    // Đọc thuộc tính cho trường ngày
    if (field.type === 'date') {
      // Lấy giá trị trực tiếp từ database
      console.log(`allowDateChange trong database: ${JSON.stringify(field.allowDateChange)}`);
      console.log(`dateFormat trong database: ${JSON.stringify(field.dateFormat)}`);
      
      // Sử dụng giá trị boolean rõ ràng cho allowDateChange
      const dateChangeAllowed = field.allowDateChange === true;
      setAllowDateChange(dateChangeAllowed);
      
      // Đọc định dạng ngày nếu có
      // Sử dụng giá trị mặc định nếu dateFormat là undefined
      setDateFormat(field.dateFormat || 'dd/mm/yyyy');
      
      console.log(`Đã đặt allowDateChange = ${dateChangeAllowed}, dateFormat = ${field.dateFormat || 'dd/mm/yyyy'}`);
    } else if (field.type === 'time') {
      // Lấy giá trị trực tiếp từ database
      console.log(`allowTimeChange trong database: ${JSON.stringify(field.allowTimeChange)}`);
      console.log(`timeFormat trong database: ${JSON.stringify(field.timeFormat)}`);
      
      // Sử dụng giá trị boolean rõ ràng cho allowTimeChange
      const timeChangeAllowed = field.allowTimeChange === true;
      setAllowTimeChange(timeChangeAllowed);
      
      // Đọc định dạng thời gian nếu có
      // Sử dụng giá trị mặc định nếu timeFormat là undefined
      setTimeFormat(field.timeFormat || '24h');
      
      console.log(`Đã đặt allowTimeChange = ${timeChangeAllowed}, timeFormat = ${field.timeFormat || '24h'}`);
    } else {
      setAllowDateChange(false); // Mặc định cho các trường khác là false
      setDateFormat('dd/mm/yyyy'); // Mặc định là dd/mm/yyyy
      setAllowTimeChange(false); // Mặc định cho các trường khác là false
      setTimeFormat('24h'); // Mặc định là 24h
    }
    
    setIsEditing(true);
    setEditingIndex(index);
  };

  // Hiển thị dialog xác nhận xóa trường
  const showDeleteConfirmation = (index: number) => {
    setFieldToDeleteIndex(index);
    setShowConfirmModal(true);
  };
  
  // Đóng dialog xác nhận
  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setFieldToDeleteIndex(-1);
  };
  
  // Xóa trường sau khi xác nhận
  const deleteField = () => {
    if (fieldToDeleteIndex === -1) return;
    
    const updatedFields = [...fields];
    updatedFields.splice(fieldToDeleteIndex, 1);
    setFields(updatedFields);
    
    // Gọi onSave để cập nhật ngay lập tức
    setTimeout(() => {
      console.log('Calling onSave after deleting field at index:', fieldToDeleteIndex);
      onSave(updatedFields);
    }, 0);
    
    // Đóng dialog
    closeConfirmModal();
  };

  // Tham chiếu đến hàm saveField đã được khai báo trước đó

  // Di chuyển trường lên/xuống
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const updatedFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Hoán đổi vị trí
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    
    // Cập nhật state
    setFields(updatedFields);
    
    // Gọi onSave để lưu thay đổi ngay lập tức
    onSave(updatedFields);
  };
  
  // Thêm tùy chọn mới cho dropdown
  const addOption = () => {
    const newOption: FieldOption = {
      value: `option${fieldOptions.length + 1}`,
      label: `Tùy chọn ${fieldOptions.length + 1}`
    };
    setFieldOptions([...fieldOptions, newOption]);
  };

  // Cập nhật tùy chọn
  const updateOption = (index: number, key: keyof FieldOption, value: string) => {
    const updatedOptions = [...fieldOptions];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [key]: value
    };
    setFieldOptions(updatedOptions);
  };

  // Xóa tùy chọn
  const removeOption = (index: number) => {
    const updatedOptions = [...fieldOptions];
    updatedOptions.splice(index, 1);
    setFieldOptions(updatedOptions);
  };

  // Lấy tên hiển thị cho loại trường
  const getFieldTypeName = (type: FieldType): string => {
    switch (type) {
      case 'text':
        return 'Text Field';
      case 'textarea':
        return 'Text Area';
      case 'dropdown':
        return 'Dropdown';
      case 'date':
        return 'Date Field';
      case 'time':
        return 'Time Field';
      case 'email':
        return 'Email Field';
      case 'number':
        return 'Number Field';
      default:
        return 'Unknown Field';
    }
  };

  // Render danh sách các trường
  const renderFieldsList = () => {
    return (
      <div className="fields-list">
        <h3>Các trường trong form</h3>
        
        {fields.length === 0 ? (
          <div className="empty-fields">
            <p>Chưa có trường nào. Hãy thêm trường mới bằng các nút bên trên.</p>
          </div>
        ) : (
          <div className="fields-container">
            {fields.map((field, index) => (
              <div key={field.id} className="field-item">
                <div className="field-info">
                  <div className="field-type">{getFieldTypeName(field.type)}</div>
                  <div className="field-label">{field.label}</div>
                  {field.required && <div className="field-required">*</div>}
                </div>
                <div className="field-actions">
                  <button 
                    type="button" 
                    className="action-button" 
                    onClick={() => moveField(index, 'up')} 
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button 
                    type="button" 
                    className="action-button" 
                    onClick={() => moveField(index, 'down')} 
                    disabled={index === fields.length - 1}
                  >
                    ↓
                  </button>
                  <button 
                    type="button" 
                    className="action-button edit" 
                    onClick={() => editField(index)}
                  >
                    ✎
                  </button>
                  <button 
                    type="button" 
                    className="action-button delete" 
                    onClick={() => showDeleteConfirmation(index)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render trình chỉnh sửa trường
  const renderFieldEditor = () => {
    if (!isEditing) return null;

    return (
      <div className="field-editor">
        <h3>{editingIndex >= 0 ? 'Chỉnh sửa trường' : 'Thêm trường mới'}</h3>
        
        <div className="form-group">
          <label>Nhãn trường</label>
          <input 
            type="text" 
            value={fieldLabel} 
            onChange={(e) => setFieldLabel(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Placeholder</label>
          <input 
            type="text" 
            value={fieldPlaceholder} 
            onChange={(e) => setFieldPlaceholder(e.target.value)}
            placeholder={fieldType === 'date' ? 
              (dateFormat === 'dd/mm/yyyy' ? 'VD: Nhập ngày (dd/mm/yyyy)' : 
               dateFormat === 'mm/dd/yyyy' ? 'VD: Nhập ngày (mm/dd/yyyy)' : 
               'VD: Nhập ngày (yyyy-mm-dd)') : 
              'Nhập placeholder...'}
          />
          {fieldType === 'date' && (
            <small className="form-hint">Placeholder sẽ hiển thị theo định dạng {dateFormat}</small>
          )}
        </div>
        
        {/* Giá trị mặc định cho các trường khác ngoài trường ngày, text, textarea và dropdown */}
        {fieldType !== 'date' && fieldType !== 'text' && fieldType !== 'textarea' && fieldType !== 'dropdown' && (
          <div className="form-group">
            <label>Giá trị mặc định</label>
            <input 
              type="text" 
              value={fieldDefaultValue} 
              onChange={(e) => setFieldDefaultValue(e.target.value)}
            />
          </div>
        )}
        
        {/* Ngày mặc định cho trường ngày */}
        {fieldType === 'date' && (
          <div className="form-group">
            <label>Ngày mặc định ({dateFormat})</label>
            <input 
              type="text" 
              value={fieldDefaultValue} 
              onChange={(e) => setFieldDefaultValue(e.target.value)}
              placeholder={dateFormat === 'dd/mm/yyyy' ? 'VD: 24/05/2025' : 
                         dateFormat === 'mm/dd/yyyy' ? 'VD: 05/24/2025' : 
                         'VD: 2025-05-24'}
            />
            <small className="form-hint">Nhập theo định dạng {dateFormat} hoặc để trống để không có giá trị mặc định</small>
          </div>
        )}
        
        {/* Tùy chọn cho trường ngày */}
        {fieldType === 'date' && (
          <>
            <div className="form-group">
              <label htmlFor="date-format">Định dạng ngày</label>
              <select
                id="date-format"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="form-control"
              >
                <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                <option value="yyyy-mm-dd">yyyy-mm-dd</option>
              </select>
              <small className="form-hint">
                Định dạng hiển thị ngày trên trang client
              </small>
            </div>
            
            <div className="toggle-option">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={allowDateChange}
                  onChange={(e) => setAllowDateChange(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">Cho phép thay đổi ngày</span>
            </div>
          </>
        )}
        
        {/* Tùy chọn cho trường thời gian */}
        {fieldType === 'time' && (
          <>
            <div className="form-group">
              <label htmlFor="time-format">Định dạng thời gian</label>
              <select
                id="time-format"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="form-control"
              >
                <option value="24h">24h (HH:mm)</option>
                <option value="12h">12h (hh:mm AM/PM)</option>
              </select>
              <small className="form-hint">
                Định dạng hiển thị thời gian trên trang client
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="time-default">Thời gian mặc định</label>
              <input
                id="time-default"
                className="form-control"
                type="text" 
                value={fieldDefaultValue} 
                onChange={(e) => setFieldDefaultValue(e.target.value)}
                placeholder={timeFormat === '24h' ? 'VD: 14:30' : 'VD: 02:30 PM'}
              />
              <small className="form-hint">Nhập theo định dạng {timeFormat === '24h' ? 'HH:mm' : 'hh:mm AM/PM'} hoặc để trống để không có giá trị mặc định</small>
            </div>
            
            <div className="toggle-option">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={allowTimeChange}
                  onChange={(e) => setAllowTimeChange(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">Cho phép thay đổi thời gian</span>
            </div>
          </>
        )}
        
        {fieldType === 'dropdown' && (
          <div className="options-config">
            <h4>Danh sách tùy chọn</h4>
            
            <div className="options-list">
              {fieldOptions.map((option, index) => (
                <div key={index} className="option-item">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                  />
                  <button
                    type="button"
                    className="remove-option-button"
                    onClick={() => removeOption(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              className="add-option-button"
              onClick={addOption}
            >
              + Thêm tùy chọn
            </button>
          </div>
        )}
        
        {/* Thêm 2 nút toggle */}
        <div className="toggle-options">
          <div className="toggle-option">
            <label className="switch">
              <input
                type="checkbox"
                checked={fieldEnabled}
                onChange={(e) => setFieldEnabled(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
            <span className="toggle-label">Hiển thị trường này trong form</span>
          </div>
          
          <div className="toggle-option">
            <label className="switch">
              <input
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
            <span className="toggle-label">Bắt buộc nhập</span>
          </div>
        </div>
        
        <div className="editor-actions">
          <button 
            type="button" 
            className="save-button" 
            onClick={saveField}
          >
            {editingIndex >= 0 ? 'Cập nhật' : 'Thêm vào form'}
          </button>
          <button 
            type="button" 
            className="cancel-button" 
            onClick={cancelEdit}
          >
            Hủy
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="form-builder-container">
      <div className="builder-content">
        {!isEditing && (
          <div className="field-types">
            <h3>Thêm trường mới</h3>
            <div className="field-type-buttons">
              <button 
                type="button" 
                className="field-type-button" 
                onClick={() => addField('text')}
              >
                Text Field
              </button>
              <button 
                type="button" 
                className="field-type-button" 
                onClick={() => addField('textarea')}
              >
                Text Area
              </button>
              <button 
                type="button" 
                className="field-type-button" 
                onClick={() => addField('dropdown')}
              >
                Dropdown
              </button>
              <button 
                type="button" 
                className="field-type-button" 
                onClick={() => addField('date')}
              >
                Date Field
              </button>
              <button 
                type="button" 
                className="field-type-button" 
                onClick={() => addField('time')}
              >
                Time Field
              </button>
            </div>
          </div>
        )}
        
        {renderFieldEditor()}
        
        {!isEditing && renderFieldsList()}
      </div>
      
      {/* Dialog xác nhận xóa trường */}
      <ReactModal
        isOpen={showConfirmModal}
        onRequestClose={closeConfirmModal}
        contentLabel="Xác nhận xóa"
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
            border: '1px solid #1e2e3e'
          }
        }}
      >
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ 
            margin: 0, 
            color: '#1e2e3e', 
            fontSize: '20px',
            fontWeight: 600
          }}>
            Xác nhận xóa
          </h2>
          <button
            onClick={closeConfirmModal}
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
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            {fieldToDeleteIndex >= 0 && fields[fieldToDeleteIndex] ? 
              `Bạn có chắc chắn muốn xóa trường "${fields[fieldToDeleteIndex].label}" không?` : 
              'Bạn có chắc chắn muốn xóa trường này không?'}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={closeConfirmModal}
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
            onClick={deleteField}
            style={{
              padding: '8px 16px',
              background: '#1e2e3e',
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
    </div>
  );
}
