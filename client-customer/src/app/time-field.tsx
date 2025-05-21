import React from 'react';

interface TimeFieldProps {
  label: string;
  required: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const TimeField: React.FC<TimeFieldProps> = ({ label, required, value, onChange, disabled }) => {
  return (
    <div className="form-group">
      <input
        id="time"
        name="time"
        type="time"
        className="time-input"
        required={required}
        value={value}
        onChange={onChange}
        placeholder={`${label} ${required ? '*' : ''}`}
        disabled={disabled}
      />
    </div>
  );
};

export default TimeField;
