import { useState } from 'react';
import { Select, Modal, Row, Col, Card, Image, Input, Button, Tag, message, Typography } from 'antd';
import { api, errMsg, fmtVND } from '../api/client';
import { t } from '../utils/status';

const mediaBase = () => (import.meta.env.VITE_API_BASE || 'http://127.0.0.1/api').replace(/\/api$/, '');
export const mediaUrl = (key) => `${mediaBase()}/files/unimate/${key}`;

// Chọn biến thể: tìm sản phẩm -> chọn biến thể (kèm tồn)
export function VariantPicker({ onPick }) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState([]);
  const [detail, setDetail] = useState(null);
  const search = async () => {
    if (!q.trim()) return;
    try {
      const { data } = await api.get('/products', { params: { search: q.trim(), limit: 8 } });
      setProducts(data.data || []);
    } catch (e) { message.error(errMsg(e)); }
  };
  const pick = async (p) => {
    try {
      const { data } = await api.get(`/products/slug/${p.slug}`);
      setDetail(data);
    } catch (e) { message.error(errMsg(e)); }
  };
  return (
    <>
      <Input.Search placeholder="Tìm sản phẩm theo tên/SKU..." value={q}
        onChange={(e) => setQ(e.target.value)} onSearch={search} style={{ marginBottom: 8 }} />
      {products.map((p) => (
        <Card key={p.id} size="small" style={{ marginBottom: 6 }}
          extra={<Button size="small" onClick={() => pick(p)}>Chọn</Button>}>
          {p.name} · {fmtVND(p.base_price)}
        </Card>
      ))}
      {detail && (detail.variants || []).map((v) => (
        <div key={v.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <Tag>{v.sku}</Tag><span style={{ flex: 1 }}>{v.name} · {fmtVND(v.price)}</span>
          <Tag color={v.available_qty > 0 ? 'green' : 'red'}>Còn {v.available_qty}</Tag>
          <Button size="small" type="primary" onClick={() => onPick(v, detail)}>Chọn</Button>
        </div>
      ))}
    </>
  );
}

// Chọn đơn hàng: tìm theo mã đơn
export function OrderPicker({ value, onChange, placeholder = 'Tìm mã đơn ORD...' }) {
  const [options, setOptions] = useState([]);
  const search = async (s) => {
    if (!s) return;
    try {
      const { data } = await api.get('/orders', { params: { search: s, limit: 10 } });
      setOptions((data.data || []).map((o) => ({ value: o.id, label: `${o.order_number} · ${fmtVND(o.total_amount)} · ${t('order', o.status)}` })));
    } catch { /* ignore */ }
  };
  return (
    <Select showSearch value={value} placeholder={placeholder} filterOption={false}
      onSearch={search} onChange={onChange} options={options} allowClear style={{ width: '100%' }} />
  );
}

// Chọn ảnh từ thư viện (xem trước). kind: 'all' | 'image' (banner chỉ nhận ảnh)
export function MediaPicker({ value, onChange, kind = 'all' }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const load = async () => {
    try {
      const { data } = await api.get('/media');
      setRows(data || []);
    } catch (e) { message.error(errMsg(e)); }
  };
  const isImg = (m) => (m.mime_type || '').startsWith('image/');
  const filtered = rows.filter((m) =>
    (kind === 'all' || (kind === 'image' && isImg(m))) &&
    (!q || (m.original_name || '').toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input value={value || ''} placeholder="Chưa chọn ảnh" readOnly style={{ width: 120 }} />
        <Button onClick={() => { setOpen(true); load(); }}>Chọn từ thư viện</Button>
        {value && <Button onClick={() => onChange(null)}>Xóa</Button>}
      </div>
      <Modal title="Chọn ảnh" open={open} onCancel={() => setOpen(false)} footer={null} width={760}
        okText="Đóng" cancelText="Đóng">
        <Input.Search placeholder="Tìm theo tên file..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12, maxWidth: 320 }} />
        <Row gutter={[12, 12]}>
          {filtered.map((m) => (
            <Col xs={12} sm={8} md={6} key={m.id}>
              <Card size="small" hoverable cover={<Image src={mediaUrl(m.object_key)} height={110} style={{ objectFit: 'cover' }} preview={{ mask: 'Xem' }} />}
                actions={[<Button key="pick" size="small" type="link" onClick={() => { onChange(m.id); setOpen(false); }}>Chọn #{m.id}</Button>]}>
                <Typography.Text ellipsis style={{ fontSize: 12 }}>{m.original_name}</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>
    </>
  );
}
