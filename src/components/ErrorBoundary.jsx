import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

// Lưới an toàn: lỗi render 1 trang không còn trắng cả app
export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('Trang lỗi:', error); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-mist p-4">
          <div className="w-full max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold">Trang gặp lỗi</h1>
            <p className="mt-1 text-sm text-slate-500">Hãy tải lại trang. Nếu vẫn lỗi, chụp phần chi tiết gửi kỹ thuật.</p>
            <div className="mx-auto mt-3 max-w-xl overflow-auto rounded-lg bg-slate-50 p-3 text-left">
              <code className="text-xs">{String(this.state.error?.message || this.state.error)}</code>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
              <Button variant="outline" onClick={() => { window.location.href = '/'; }}>Về trang chủ</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Forbidden = ({ text = 'Bạn không có quyền xem trang này' }) => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="text-center">
      <div className="text-5xl font-bold text-slate-200">403</div>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
      <Link to="/"><Button className="mt-4">Về trang chủ</Button></Link>
    </div>
  </div>
);

export const NotFound = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="text-center">
      <div className="text-5xl font-bold text-slate-200">404</div>
      <p className="mt-2 text-sm text-slate-500">Không tìm thấy trang</p>
      <Link to="/"><Button className="mt-4">Về trang chủ</Button></Link>
    </div>
  </div>
);
