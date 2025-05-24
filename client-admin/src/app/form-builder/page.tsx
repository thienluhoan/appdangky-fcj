"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../form/styles.css';
import './form-builder.css';

// Định nghĩa các loại trường
type FieldType = 'text' | 'textarea' | 'dropdown';

// Cấu trúc của một trường form
interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[]; // Chỉ dùng cho dropdown
}

export default function FormBuilderPage() {
  const router = useRouter();
  const [formTitle, setFormTitle] = useState<string>('Form mới');
  const [fields, setFields] = useState<FormField[]>([]);
  const [currentField, setCurrentField] = useState<FormField | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  // Tạo ID ngẫu nhiên cho trường mới
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Thêm trường mới vào form
  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: `Trường ${type} mới`,
      placeholder: 'Nhập nội dung...',
      required: false,
      options: type === 'dropdown' ? ['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3'] : undefined
    };

    setCurrentField(newField);
    setIsEditing(false);
    setEditIndex(-1);
  };

  // Lưu trường hiện tại vào danh sách
  const saveField = () => {
    if (!currentField) return;

    if (isEditing && editIndex >= 0) {
      // Cập nhật trường đã tồn tại
      const updatedFields = [...fields];
      updatedFields[editIndex] = currentField;
      setFields(updatedFields);
    } else {
      // Thêm trường mới
      setFields([...fields, currentField]);
    }

    // Reset trạng thái
    setCurrentField(null);
    setIsEditing(false);
    setEditIndex(-1);
  };

  // Hủy thao tác chỉnh sửa
  const cancelEdit = () => {
    setCurrentField(null);
    setIsEditing(false);
    setEditIndex(-1);
  };

  // Chỉnh sửa trường đã tồn tại
  const editField = (index: number) => {
    setCurrentField({...fields[index]});
    setIsEditing(true);
    setEditIndex(index);
  };

  // Xóa trường
  const deleteField = (index: number) => {
    const updatedFields = [...fields];
    updatedFields.splice(index, 1);
    setFields(updatedFields);
  };

  // Thay đổi thứ tự trường
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
    
    // Lưu thay đổi ngay lập tức vào database
    saveFormToDatabase(updatedFields);
  };

  // Cập nhật thuộc tính của trường hiện tại
  const updateCurrentField = (key: keyof FormField, value: any) => {
    if (!currentField) return;
    
    setCurrentField({
      ...currentField,
      [key]: value
    });
  };

  // Thêm tùy chọn mới cho dropdown
  const addOption = () => {
    if (!currentField || currentField.type !== 'dropdown') return;
    
    const options = [...(currentField.options || []), `Tùy chọn ${(currentField.options?.length || 0) + 1}`];
    
    setCurrentField({
      ...currentField,
      options
    });
  };

  // Cập nhật tùy chọn cho dropdown
  const updateOption = (index: number, value: string) => {
    if (!currentField || !currentField.options) return;
    
    const options = [...currentField.options];
    options[index] = value;
    
    setCurrentField({
      ...currentField,
      options
    });
  };

  // Xóa tùy chọn cho dropdown
  const deleteOption = (index: number) => {
    if (!currentField || !currentField.options) return;
    
    const options = [...currentField.options];
    options.splice(index, 1);
    
    setCurrentField({
      ...currentField,
      options
    });
  };

  // Lưu form vào database
  const saveFormToDatabase = async (fieldsToSave = fields) => {
    try {
      // Gọi API để lưu form vào database
      const response = await fetch('/api/form-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formTitle,
          fields: fieldsToSave.map((field, index) => ({
            ...field,
            order: index // Thêm thứ tự cho mỗi trường dựa vào vị trí trong mảng
          }))
        }),
      });

      if (response.ok) {
        console.log('Form đã được lưu thành công!');
        // Hiển thị thông báo thành công (có thể sử dụng toast hoặc cách khác)
      } else {
        console.error('Lỗi khi lưu form:', await response.text());
        alert('Lỗi khi lưu form. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Lỗi khi lưu form:', error);
      alert('Lỗi khi lưu form. Vui lòng thử lại sau.');
    }
  };

  // Lưu form (gọi khi nhấn nút Lưu)
  const saveForm = () => {
    saveFormToDatabase();
  };

  // Render trình chỉnh sửa trường
  const renderFieldEditor = () => {
    if (!currentField) return null;

    return (
      <div className="field-editor">
        <h3>{isEditing ? 'Chỉnh sửa trường' : 'Thêm trường mới'}</h3>
        
        <div className="form-group">
          <label>Nhãn trường</label>
          <input 
            type="text" 
            value={currentField.label} 
            onChange={(e) => updateCurrentField('label', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Placeholder</label>
          <input 
            type="text" 
            value={currentField.placeholder} 
            onChange={(e) => updateCurrentField('placeholder', e.target.value)}
          />
        </div>
        
        <div className="form-group checkbox-group">
          <input 
            type="checkbox" 
            id="required" 
            checked={currentField.required} 
            onChange={(e) => updateCurrentField('required', e.target.checked)}
          />
          <label htmlFor="required">Bắt buộc</label>
        </div>
        
        {currentField.type === 'dropdown' && (
          <div className="options-container">
            <label>Tùy chọn</label>
            {currentField.options?.map((option, index) => (
              <div key={index} className="option-row">
                <input 
                  type="text" 
                  value={option} 
                  onChange={(e) => updateOption(index, e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn-icon remove" 
                  onClick={() => deleteOption(index)}
                >
                  &times;
                </button>
              </div>
            ))}
            <button 
              type="button" 
              className="btn-add-option" 
              onClick={addOption}
            >
              + Thêm tùy chọn
            </button>
          </div>
        )}
        
        <div className="button-group">
          <button 
            type="button" 
            className="save-button" 
            onClick={saveField}
          >
            {isEditing ? 'Cập nhật' : 'Thêm vào form'}
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

  // Render danh sách các trường đã thêm
  const renderFieldsList = () => {
    if (fields.length === 0) {
      return (
        <div className="empty-fields">
          <p>Chưa có trường nào. Hãy thêm trường mới bằng các nút bên trên.</p>
        </div>
      );
    }

    return (
      <div className="fields-list">
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
                onClick={() => deleteField(index)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Lấy tên hiển thị cho loại trường
  const getFieldTypeName = (type: FieldType): string => {
    switch (type) {
      case 'text': return 'Text Field';
      case 'textarea': return 'Text Area';
      case 'dropdown': return 'Dropdown';
      default: return 'Unknown';
    }
  };

  // Render xem trước form
  const renderPreview = () => {
    return (
      <div className="form-preview">
        <h2>{formTitle}</h2>
        <form>
          {fields.map((field) => (
            <div key={field.id} className="preview-field">
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              
              {field.type === 'text' && (
                <input 
                  type="text" 
                  placeholder={field.placeholder} 
                  required={field.required}
                />
              )}
              
              {field.type === 'textarea' && (
                <textarea 
                  placeholder={field.placeholder} 
                  required={field.required} 
                  rows={4}
                />
              )}
              
              {field.type === 'dropdown' && (
                <select required={field.required}>
                  <option value="">{field.placeholder}</option>
                  {field.options?.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
          
          {fields.length > 0 && (
            <button type="button" className="preview-submit">
              Gửi
            </button>
          )}
        </form>
      </div>
    );
  };

  return (
    <div className="form-builder-container">
      <h1>Form Builder</h1>
      
      <div className="form-title-container">
        <label htmlFor="formTitle">Tiêu đề form:</label>
        <input 
          type="text" 
          id="formTitle" 
          value={formTitle} 
          onChange={(e) => setFormTitle(e.target.value)}
        />
      </div>
      
      <div className="view-toggle">
        <button 
          className={!previewMode ? 'active' : ''} 
          onClick={() => setPreviewMode(false)}
        >
          Chỉnh sửa
        </button>
        <button 
          className={previewMode ? 'active' : ''} 
          onClick={() => setPreviewMode(true)}
        >
          Xem trước
        </button>
      </div>
      
      {!previewMode ? (
        <div className="builder-content">
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
            </div>
          </div>
          
          <div className="builder-main">
            <div className="fields-container">
              <h3>Các trường trong form</h3>
              {renderFieldsList()}
            </div>
            
            {currentField && (
              <div className="editor-container">
                {renderFieldEditor()}
              </div>
            )}
          </div>
        </div>
      ) : (
        renderPreview()
      )}
      
      <div className="form-actions">
        <button 
          type="button" 
          className="save-form-button" 
          onClick={saveForm}
        >
          Lưu Form
        </button>
        <button 
          type="button" 
          className="back-button" 
          onClick={() => router.push('/form')}
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}
