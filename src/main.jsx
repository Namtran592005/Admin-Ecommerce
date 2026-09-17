import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

dayjs.locale('vi');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#0f4c81',
          colorInfo: '#0f4c81',
          colorSuccess: '#15803d',
          colorWarning: '#b45309',
          colorError: '#b91c1c',
          colorBgLayout: '#f2f2f5',
          colorText: '#1d1d1f',
          borderRadius: 10,
          fontFamily: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
        },
        components: {
          Layout: { siderBg: '#161618', headerBg: '#ffffff' },
          Menu: { darkItemBg: '#161618', darkSubMenuItemBg: '#161618', darkItemSelectedBg: 'rgba(255,255,255,.12)', darkItemBorderRadius: 8 },
          Card: { borderRadiusLG: 14 },
          Button: { borderRadius: 8 },
          Table: { headerBg: '#f7f7f9' },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
