"use client";

import React from 'react';

// Interface for Visit object
interface Visit {
  id: string;
  name: string;
  email: string;
  phone: string;
  school: string;
  date: string;
  time?: string;
  floor?: string;
  purpose: string;
  contact: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  timestamp?: string;
}

// Format date to display in Vietnamese format
export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString('vi-VN', options);
};

// Get unique dates from visits array
export const getUniqueDates = (visits: Visit[]): string[] => {
  const uniqueDates = new Set<string>();
  
  visits.forEach(visit => {
    const dateToUse = visit.date || visit.createdAt;
    const formattedDate = formatDate(dateToUse);
    uniqueDates.add(formattedDate);
  });
  
  return Array.from(uniqueDates).sort((a, b) => {
    // Sort dates in descending order (newest first)
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });
};

// Group visits by date
export const groupVisitsByDate = (visits: Visit[]): Record<string, Visit[]> => {
  const grouped: Record<string, Visit[]> = {};
  
  visits.forEach(visit => {
    const dateToUse = visit.date || visit.createdAt;
    const formattedDate = formatDate(dateToUse);
    
    if (!grouped[formattedDate]) {
      grouped[formattedDate] = [];
    }
    
    grouped[formattedDate].push(visit);
  });
  
  return grouped;
};

// Date filter select component
export const DateFilterSelect: React.FC<{
  dates: string[];
  selectedDate: string;
  onChange: (date: string) => void;
}> = ({ dates, selectedDate, onChange }) => {
  return (
    <div style={{ 
      marginRight: '10px',
      display: 'flex',
      alignItems: 'center'
    }}>
      <label 
        htmlFor="dateFilter" 
        style={{ 
          marginRight: '8px', 
          fontSize: '14px',
          fontWeight: '500',
          color: '#333'
        }}
      >
        Lọc theo ngày:
      </label>
      <select
        id="dateFilter"
        value={selectedDate}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          backgroundColor: 'white',
          color: '#333',
          fontSize: '14px',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '150px',
          height: '40px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <option value="all">Tất cả các ngày</option>
        {dates.map(date => (
          <option key={date} value={date}>
            {date}
          </option>
        ))}
      </select>
    </div>
  );
};

// Grouped visits list component
export const GroupedVisitsList: React.FC<{
  groupedVisits: Record<string, Visit[]>;
  renderVisitRow: (visit: Visit, index: number) => React.ReactNode;
}> = ({ groupedVisits, renderVisitRow }) => {
  return (
    <>
      {Object.entries(groupedVisits).map(([date, visitsForDate], groupIndex) => (
        <React.Fragment key={date}>
          <tr style={{ backgroundColor: '#f0f4f8' }}>
            <td 
              colSpan={10} 
              style={{ 
                padding: '10px 15px', 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: '#1e2e3e',
                borderBottom: '1px solid #ddd'
              }}
            >
              Ngày: {date} ({visitsForDate.length} đăng ký)
            </td>
          </tr>
          {visitsForDate.map((visit, index) => renderVisitRow(visit, index))}
        </React.Fragment>
      ))}
    </>
  );
};
