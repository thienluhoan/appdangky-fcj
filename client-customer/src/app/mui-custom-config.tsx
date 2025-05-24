import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Tạo theme tùy chỉnh cho MUI
const theme = createTheme({
  components: {
    // Tùy chỉnh FormLabel để không hiển thị dấu * cho trường bắt buộc
    MuiFormLabel: {
      styleOverrides: {
        asterisk: {
          display: 'none' // Ẩn dấu * của MUI
        },
      },
    },
  },
});

// Component bao bọc để áp dụng theme tùy chỉnh
export const MuiCustomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
};
