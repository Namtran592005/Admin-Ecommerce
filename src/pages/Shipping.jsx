import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Timeline, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';

const SHIP_FLOW = ['pending', 'ready', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'];

export default function Shipping() {
  const { can } = useAuth();
  const writable = can('shipping.write');
  const [methods, setMethods] = useState([]);
  const [ships, setShips] = useState([]);
  const [sel, setSel] = useState(null);
  const [track, setTrack] = useState([]);
  const [mOpen, setMOpen] = useState(false);
  const [form] = Form.useForm();
  const load = (quiet = false) => {
    api.get('/shipping/methods').then((r) => setMethods(r.data)).catch(() => {});
    api.get('/shipping/shipments').then((r) => setShips(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const open = async (id, quiet = false) => {
    try { const { data } = await api.get(`/shipping/shipments/${id}`); setSel(data); setTrack(data.tracking || []); }
    catch (e) { if (!quiet) message.error(errMsg(e)); }
  };
  const saveMethod = async (v) => {
    try { await api.post('/shipping/methods', v); message.success('Đã thêm'); setMOpen(false); form.resetFields(); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const setStatus = async (status) => {
    try { await api.patch(`/shipping/shipments/${sel.id}/status`, { status }); message.success('Đã cập nhật'); open(sel.id, true); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 's', label: 'Vận đơn', children: (
          <Table size="small" dataSource={ships} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'ID', dataIndex: 'id' }, { title: 'Đơn', dataIndex: 'order_id' },
            { title: 'Mã vận đơn', dataIndex: 'tracking_number' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'delivered' ? 'green' : 'blue'}>{t('ship', v)}</Tag> },
            { title: 'Phí ship', dataIndex: 'shipping_fee', render: fmtVND },
            { title: 'COD', dataIndex: 'cod_amount', render: fmtVND },
            { title: '', render: (_, r) => <Button size="small" onClick={() => open(r.id)}>Theo dõi</Button> },
          ]} />
        ) },
        { key: 'm', label: 'Hình thức giao hàng', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setMOpen(true)} style={{ marginBottom: 12 }}>Thêm hình thức</Button>}
          <Table size="small" dataSource={methods} rowKey="id" pagination={false} columns={[
            { title: 'Mã', dataIndex: 'code' }, { title: 'Tên', dataIndex: 'name' },
            { title: 'Phí', dataIndex: 'base_fee', render: fmtVND },
            { title: 'Bật', dataIndex: 'is_active', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag> },
          ]} />
        </>) },
      ]} />

      <Modal title={sel && `Vận đơn #${sel.id} (đơn ${sel.order_id})`} open={!!sel} onCancel={() => setSel(null)} footer={null} width={600}>
        {sel && (<>
          {writable && (
            <div style={{ marginBottom: 12 }}>
              <Select placeholder="Chuyển trạng thái" style={{ width: 220 }} onChange={setStatus} options={opts('ship', SHIP_FLOW)} />
            </div>
          )}
          <Timeline items={track.map((tr) => ({ label: fmtDate(tr.occurred_at), children: `${t('ship', tr.status)}${tr.description && tr.description !== tr.status ? ' — ' + tr.description : ''}${tr.location ? ` (${tr.location})` : ''}` }))} />
        </>)}
      </Modal>
      <Modal title="Thêm hình thức giao hàng" open={mOpen} width={560} okText="Lưu" cancelText="Hủy" onCancel={() => setMOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={saveMethod}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Nhập mã' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="base_fee" label="Phí (VND)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
