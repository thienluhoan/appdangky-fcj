import React from 'react';

interface DateFieldProps {
  label: string;
  required: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const DateField: React.FC<DateFieldProps> = ({ label, required, value, onChange, disabled }) => {
  return (
    <div className="form-group">
      <input
        id="date"
        name="date"
        type="date"
        className="date-input"
        required={required}
        value={value}
        onChange={onChange}
        placeholder={`${label} ${required ? '*' : ''}`}
        disabled={disabled}
      />
      <div className="form-note" style={{ 
        fontSize: '0.9rem',
        color: '#555',
        margin: '8px 0 12px 2px',
        fontStyle: 'italic',
        textAlign: 'left'
      }}>
        Để trống để tự động sử dụng ngày mai làm giá trị mặc định.
      </div>
    </div>
  );
};

export default DateField;
