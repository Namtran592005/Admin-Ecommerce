import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Tag, Rate, message, Select } from 'antd';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';

export default function Reviews() {
  const { can } = useAuth();
  const canReview = can('reviews.write');
  const canReturn = can('returns.write');
  const [productId, setProductId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [returns, setReturns] = useState([]);

  const loadReturns = (quiet = false) => api.get('/returns').then((r) => setReturns(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
  useEffect(() => { loadReturns(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') loadReturns(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const loadReviews = () => {
    if (!productId) return message.warning('Nhập ID sản phẩm để xem đánh giá');
    api.get(`/products/${productId}/reviews`).then((r) => setReviews(r.data)).catch((e) => message.error(errMsg(e)));
  };
  const reviewStatus = async (id, status) => {
    try { await api.patch(`/reviews/${id}/status`, { status }); message.success('Đã cập nhật'); loadReviews(); }
    catch (e) { message.error(errMsg(e)); }
  };
  const returnStatus = async (id, status) => {
    try { await api.patch(`/returns/${id}/status`, { status }); message.success('Đã cập nhật'); loadReturns(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'ret', label: 'Đổi trả', children: (
          <Table size="small" dataSource={returns} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Số', dataIndex: 'return_number' }, { title: 'Đơn', dataIndex: 'order_id' },
            { title: 'Lý do', dataIndex: 'reason_code' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('ret', v)}</Tag> },
            { title: 'Ngày', dataIndex: 'requested_at', render: fmtDate },
            { title: '', render: (_, r) => canReturn && (
              <Select size="small" style={{ width: 170 }} placeholder="Đổi trạng thái" value={r.status}
                onChange={(v) => returnStatus(r.id, v)}
                options={opts('ret', ['requested', 'approved', 'rejected', 'customer_shipping', 'received', 'inspecting', 'accepted', 'refunded', 'cancelled'])} />
            ) },
          ]} />
        ) },
        { key: 'rev', label: 'Đánh giá', children: (<>
          <div className="toolbar">
            <input placeholder="ID sản phẩm" value={productId} onChange={(e) => setProductId(e.target.value)}
              style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 11px', width: 160 }} />
            <Button type="primary" onClick={loadReviews}>Xem</Button>
          </div>
          <Table size="small" dataSource={reviews} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Sao', dataIndex: 'rating', render: (v) => <Rate disabled value={v} /> },
            { title: 'Tiêu đề', dataIndex: 'title' }, { title: 'Nội dung', dataIndex: 'content' },
            { title: 'Mua thật', dataIndex: 'is_verified_purchase', render: (v) => v ? <Tag color="green">Có</Tag> : '—' },
            { title: 'Ngày', dataIndex: 'created_at', render: fmtDate },
            { title: '', render: (_, r) => canReview && (
              <Select size="small" style={{ width: 130 }} placeholder="Duyệt" onChange={(v) => reviewStatus(r.id, v)}
                options={opts('review', ['pending', 'published', 'hidden', 'rejected'])} />
            ) },
          ]} />
        </>) },
      ]} />
    </div>
  );
}
