import { useEffect, useRef, useState } from 'react';
import { Table, Tag, Input, Select, Button, Drawer, Descriptions, Tabs, Timeline, Input as AntInput, message, Space, Popconfirm } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';

const STATUS_COLOR = { pending: 'default', confirmed: 'blue', processing: 'cyan', packed: 'geekblue', shipping: 'orange', delivered: 'green', completed: 'green', cancelled: 'red', returned: 'volcano', refunded: 'purple' };
const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['packed', 'cancelled'], packed: ['shipping', 'cancelled'], shipping: ['delivered', 'returned'], delivered: ['completed', 'returned'], completed: [], cancelled: [], returned: ['refunded'], refunded: [] };

export default function Orders() {
  const { can } = useAuth();
  const writable = can('orders.write');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pg, setPg] = useState({ page: 1, limit: 15, total: 0 });
  const [f, setF] = useState({ status: '', payment_status: '', search: '' });
  const [sel, setSel] = useState(null);
  const pgRef = useRef(pg);
  pgRef.current = pg;

  const load = async (page = 1, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { page, limit: pgRef.current.limit, ...f } });
      setRows(data.data); setPg({ page, limit: pgRef.current.limit, total: data.pagination.total });
    } catch (e) { if (!quiet) message.error(errMsg(e)); } finally { if (!quiet) setLoading(false); }
  };
  useEffect(() => { load(1); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(pgRef.current.page, true); }, 30000);
    return () => clearInterval(id);
  }, []);

  const open = async (id, quiet = false) => {
    try { const { data } = await api.get(`/orders/${id}`); setSel(data); }
    catch (e) { if (!quiet) message.error(errMsg(e)); }
  };
  const changeStatus = async (status) => {
    try {
      await api.patch(`/orders/${sel.id}/status`, { status });
      message.success('Đã chuyển: ' + t('order', status));
      open(sel.id, true); load(pg.page, true);
    } catch (e) { message.error(errMsg(e)); }
  };
  const addNote = async (note) => {
    if (!note?.trim()) return;
    try { await api.post(`/orders/${sel.id}/notes`, { note }); message.success('Đã ghi chú'); open(sel.id, true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <div className="toolbar">
        <Select placeholder="Trạng thái" allowClear style={{ width: 170 }} value={f.status || undefined}
          onChange={(v) => setF({ ...f, status: v || '' })} options={opts('order', Object.keys(NEXT))} />
        <Select placeholder="Thanh toán" allowClear style={{ width: 170 }} value={f.payment_status || undefined}
          onChange={(v) => setF({ ...f, payment_status: v || '' })}
          options={opts('pay', ['unpaid', 'pending', 'paid', 'failed', 'refunded'])} />
        <Input.Search placeholder="Mã đơn ORD..." style={{ width: 220 }} value={f.search}
          onChange={(e) => setF({ ...f, search: e.target.value })} onSearch={() => load(1)} />
        <Button type="primary" onClick={() => load(1)}>Lọc</Button>
      </div>
      <Table loading={loading} dataSource={rows} rowKey="id"
        pagination={{ current: pg.page, pageSize: pg.limit, total: pg.total, onChange: (p) => load(p) }}
        columns={[
          { title: 'Mã đơn', dataIndex: 'order_number', render: (v, r) => <a onClick={() => open(r.id)}>{v}</a> },
          { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLOR[v]}>{t('order', v)}</Tag> },
          { title: 'Thanh toán', dataIndex: 'payment_status', render: (v) => <Tag>{t('pay', v)}</Tag> },
          { title: 'Tổng', dataIndex: 'total_amount', render: fmtVND },
          { title: 'Coupon', dataIndex: 'coupon_code' },
          { title: 'Ngày đặt', dataIndex: 'placed_at', render: fmtDate },
          { title: '', render: (_, r) => <Button icon={<EyeOutlined />} onClick={() => open(r.id)}>Chi tiết</Button> },
        ]} />

      <Drawer title={sel && `Đơn ${sel.order_number}`} width={720} open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <Tabs items={[
            { key: 'info', label: 'Thông tin', children: (
              <>
                <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                  <Items label="Trạng thái"><Tag color={STATUS_COLOR[sel.status]}>{t('order', sel.status)}</Tag></Items>
                  <Items label="Thanh toán"><Tag>{t('pay', sel.payment_status)}</Tag></Items>
                  <Items label="Tạm tính">{fmtVND(sel.subtotal)}</Items>
                  <Items label="Giảm giá">{fmtVND(sel.order_discount_amount)}</Items>
                  <Items label="Phí ship">{fmtVND(sel.shipping_fee)}</Items>
                  <Items label="Tổng">{fmtVND(sel.total_amount)}</Items>
                  <Items label="Ghi chú" span={2}>{sel.customer_note || '—'}</Items>
                </Descriptions>
                {writable && (
                  <Space style={{ marginTop: 12 }} wrap>
                    {(NEXT[sel.status] || []).map((s) => (
                      <Popconfirm key={s} title={`Chuyển sang "${t('order', s)}"?`} okText="Đồng ý" cancelText="Hủy" onConfirm={() => changeStatus(s)}>
                        <Button type={s === 'cancelled' ? 'default' : 'primary'} danger={s === 'cancelled'}>{t('order', s)}</Button>
                      </Popconfirm>
                    ))}
                  </Space>
                )}
              </>
            ) },
            { key: 'items', label: `Món hàng (${sel.items.length})`, children: (
              <Table size="small" pagination={false} dataSource={sel.items} rowKey="id" columns={[
                { title: 'Sản phẩm', dataIndex: 'product_name_snapshot' },
                { title: 'SKU', dataIndex: 'sku_snapshot' },
                { title: 'Giá', dataIndex: 'unit_price', render: fmtVND },
                { title: 'SL', dataIndex: 'quantity' },
                { title: 'Tổng', dataIndex: 'total_amount', render: fmtVND },
              ]} />
            ) },
            { key: 'addr', label: 'Địa chỉ', children: sel.addresses.map((a) => (
              <Descriptions key={a.id} title={a.address_type === 'shipping' ? 'Giao hàng' : 'Thanh toán'} bordered size="small" style={{ marginBottom: 8 }}>
                <Descriptions.Item label="Người nhận">{a.recipient_name} · {a.phone}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={2}>{`${a.address_line}, ${a.ward_name || ''}, ${a.district_name || ''}, ${a.province_name}`}</Descriptions.Item>
              </Descriptions>
            )) },
            { key: 'hist', label: 'Lịch sử', children: (
              <Timeline items={sel.history.map((h) => ({ label: fmtDate(h.created_at), children: `${t('order', h.from_status) || '—'} → ${t('order', h.to_status)}${h.note ? ` (${h.note})` : ''}` }))} />
            ) },
            { key: 'notes', label: `Ghi chú (${sel.notes.length})`, children: (
              <>
                {sel.notes.map((n) => <p key={n.id}>• [{fmtDate(n.created_at)}] {n.note}</p>)}
                <AntInput.Search placeholder="Thêm ghi chú..." enterButton="Lưu" onSearch={(v) => addNote(v)} />
              </>
            ) },
          ]} />
        )}
      </Drawer>
    </div>
  );
}

const Items = Descriptions.Item;
