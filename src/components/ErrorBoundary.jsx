import React from 'react';
import { Result, Button } from 'antd';

// Lưới an toàn: lỗi render 1 trang không còn trắng cả app
export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('Trang lỗi:', error); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <Result status="error" title="Trang gặp lỗi"
            subTitle="Hãy tải lại trang. Nếu vẫn lỗi, chụp màn hình lỗi dưới gửi kỹ thuật."
            extra={[
              <Button key="reload" type="primary" onClick={() => window.location.reload()}>Tải lại trang</Button>,
              <Button key="home" onClick={() => { window.location.href = '/'; }}>Về trang chủ</Button>,
            ]}>
            <div style={{ textAlign: 'left', background: '#f5f5f5', padding: 12, borderRadius: 8, maxWidth: 640, margin: '0 auto' }}>
              <code style={{ fontSize: 12 }}>{String(this.state.error?.message || this.state.error)}</code>
            </div>
          </Result>
        </div>
      );
    }
    return this.props.children;
  }
}
