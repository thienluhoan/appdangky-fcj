"use client";

import React, { useState, useEffect, useRef } from 'react';
import './custom-time-picker.css';

interface CustomTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  use24Hours?: boolean;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ 
  value, 
  onChange, 
  label,
  use24Hours = true
}) => {
  // Phân tách giờ và phút từ giá trị đầu vào
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [showHourDropdown, setShowHourDropdown] = useState(false);
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Cập nhật giờ và phút khi value thay đổi
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const hourNum = parseInt(h, 10);
      
      if (!use24Hours) {
        // Convert to 12-hour format
        if (hourNum === 0) {
          setHours('12');
          setPeriod('AM');
        } else if (hourNum === 12) {
          setHours('12');
          setPeriod('PM');
        } else if (hourNum > 12) {
          setHours((hourNum - 12).toString().padStart(2, '0'));
          setPeriod('PM');
        } else {
          setHours(hourNum.toString().padStart(2, '0'));
          setPeriod('AM');
        }
      } else {
        setHours(h);
      }
      
      setMinutes(m);
    }
  }, [value, use24Hours]);

  // Xử lý khi click bên ngoài dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hourRef.current && !hourRef.current.contains(event.target as Node)) {
        setShowHourDropdown(false);
      }
      if (minuteRef.current && !minuteRef.current.contains(event.target as Node)) {
        setShowMinuteDropdown(false);
      }
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tạo mảng giờ
  const getHourOptions = () => {
    const options = [];
    const maxHour = use24Hours ? 23 : 12;
    const minHour = use24Hours ? 0 : 1;
    
    for (let i = minHour; i <= maxHour; i++) {
      options.push(i.toString().padStart(2, '0'));
    }
    
    return options;
  };

  // Tạo mảng phút - hiển thị tất cả các phút từ 00-59
  const getMinuteOptions = () => {
    const options = [];
    for (let i = 0; i < 60; i++) {
      options.push(i.toString().padStart(2, '0'));
    }
    return options;
  };

  // Xử lý khi chọn giờ
  const handleHourSelect = (hour: string) => {
    setHours(hour);
    setShowHourDropdown(false);
    updateTimeValue(hour, minutes);
  };

  // Xử lý khi chọn phút
  const handleMinuteSelect = (minute: string) => {
    setMinutes(minute);
    setShowMinuteDropdown(false);
    updateTimeValue(hours, minute);
  };

  // Xử lý khi chọn AM/PM
  const handlePeriodSelect = (newPeriod: 'AM' | 'PM') => {
    setPeriod(newPeriod);
    setShowPeriodDropdown(false);
    updateTimeValue(hours, minutes, newPeriod);
  };

  // Cập nhật giá trị thời gian
  const updateTimeValue = (h: string, m: string, p: 'AM' | 'PM' = period) => {
    if (!h || !m) return;

    let hourValue = parseInt(h, 10);
    
    if (!use24Hours) {
      // Convert to 24-hour format
      if (p === 'PM' && hourValue < 12) {
        hourValue += 12;
      } else if (p === 'AM' && hourValue === 12) {
        hourValue = 0;
      }
    }
    
    onChange(`${hourValue.toString().padStart(2, '0')}:${m}`);
  };

  return (
    <div className="modern-time-picker">
      <div className="time-picker-container">
        {/* Hour Selector */}
        <div className="time-field-container" ref={hourRef}>
          <div 
            className="time-field"
            onClick={() => setShowHourDropdown(!showHourDropdown)}
          >
            {hours || '00'}
          </div>
          {showHourDropdown && (
            <div className="time-dropdown">
              {getHourOptions().map((hour) => (
                <div 
                  key={hour} 
                  className={`time-dropdown-item ${hours === hour ? 'active' : ''}`}
                  onClick={() => handleHourSelect(hour)}
                >
                  {hour}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <span className="time-separator">:</span>
        
        {/* Minute Selector */}
        <div className="time-field-container" ref={minuteRef}>
          <div 
            className="time-field"
            onClick={() => setShowMinuteDropdown(!showMinuteDropdown)}
          >
            {minutes || '00'}
          </div>
          {showMinuteDropdown && (
            <div className="time-dropdown">
              {getMinuteOptions().map((minute) => (
                <div 
                  key={minute} 
                  className={`time-dropdown-item ${minutes === minute ? 'active' : ''}`}
                  onClick={() => handleMinuteSelect(minute)}
                >
                  {minute}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* AM/PM Selector (only if not using 24-hour format) */}
        {!use24Hours && (
          <div className="time-field-container period" ref={periodRef}>
            <div 
              className="time-field"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              {period}
            </div>
            {showPeriodDropdown && (
              <div className="time-dropdown period-dropdown">
                <div 
                  className={`time-dropdown-item ${period === 'AM' ? 'active' : ''}`}
                  onClick={() => handlePeriodSelect('AM')}
                >
                  AM
                </div>
                <div 
                  className={`time-dropdown-item ${period === 'PM' ? 'active' : ''}`}
                  onClick={() => handlePeriodSelect('PM')}
                >
                  PM
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {label && <label className="time-picker-label">{label}</label>}
    </div>
  );
};

export default CustomTimePicker;
