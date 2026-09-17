import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { VariantPicker } from '../components/pickers';

export default function Inventory() {
  const { can } = useAuth();
  const writable = can('inventory.write');
  const [whs, setWhs] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [moves, setMoves] = useState([]);
  const [adjs, setAdjs] = useState([]);
  const [trfs, setTrfs] = useState([]);
  const [whOpen, setWhOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [form] = Form.useForm();
  const [sform] = Form.useForm();
  const [aform] = Form.useForm();

  const load = (quiet = false) => {
    api.get('/inventory/warehouses').then((r) => setWhs(r.data)).catch(() => {});
    api.get('/inventory/stocks').then((r) => setStocks(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
    api.get('/inventory/stock-movements').then((r) => setMoves(r.data)).catch(() => {});
    api.get('/inventory/adjustments').then((r) => setAdjs(r.data)).catch(() => {});
    api.get('/inventory/transfers').then((r) => setTrfs(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const saveWh = async (v) => {
    try { await api.post('/inventory/warehouses', v); message.success('Đã thêm kho'); setWhOpen(false); form.resetFields(); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const saveStock = async (v) => {
    if (!picked) return message.warning('Chọn biến thể bên dưới');
    try { await api.put('/inventory/stocks', { ...v, variant_id: picked.id }); message.success('Đã cập nhật tồn'); setStockOpen(false); sform.resetFields(); setPicked(null); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const saveAdj = async (v) => {
    if (!picked) return message.warning('Chọn biến thể bên dưới');
    try {
      await api.post('/inventory/adjustments', { warehouse_id: v.warehouse_id, reason: v.reason, items: [{ variant_id: picked.id, new_quantity: v.new_quantity }] });
      message.success('Đã tạo phiếu điều chỉnh'); setAdjOpen(false); aform.resetFields(); setPicked(null); load(true);
    } catch (e) { message.error(errMsg(e)); }
  };
  const postAdj = async (id) => {
    try { await api.post(`/inventory/adjustments/${id}/post`); message.success('Đã chốt phiếu'); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'stock', label: 'Tồn kho', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setPicked(null); setStockOpen(true); }} style={{ marginBottom: 12 }}>Nhập / set tồn</Button>}
          <Table size="small" dataSource={stocks} rowKey={(r) => r.warehouse_id + '-' + r.variant_id} pagination={{ pageSize: 12 }} columns={[
            { title: 'Kho', dataIndex: 'warehouse_code' }, { title: 'SKU', dataIndex: 'sku' },
            { title: 'Tên', dataIndex: 'variant_name' }, { title: 'Tồn', dataIndex: 'quantity' },
            { title: 'Giữ', dataIndex: 'reserved_quantity' },
            { title: 'Khả dụng', render: (_, r) => r.quantity - r.reserved_quantity },
            { title: 'Ngưỡng', dataIndex: 'reorder_level' },
          ]} />
        </>) },
        { key: 'wh', label: 'Kho hàng', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setWhOpen(true)} style={{ marginBottom: 12 }}>Thêm kho</Button>}
          <Table size="small" dataSource={whs} rowKey="id" pagination={false} columns={[
            { title: 'Mã', dataIndex: 'code' }, { title: 'Tên', dataIndex: 'name' },
            { title: 'Địa chỉ', dataIndex: 'address' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{t('warehouse', v)}</Tag> },
          ]} />
        </>) },
        { key: 'move', label: 'Xuất nhập kho', children: (
          <Table size="small" dataSource={moves} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Kho', dataIndex: 'warehouse_id' }, { title: 'Biến thể', dataIndex: 'variant_id' },
            { title: 'Loại', dataIndex: 'type', render: (v) => <Tag>{t('move', v)}</Tag> },
            { title: 'SL', dataIndex: 'quantity' }, { title: 'Tham chiếu', dataIndex: 'reference_type' },
            { title: 'Ghi chú', dataIndex: 'note' }, { title: 'Lúc', dataIndex: 'created_at', render: fmtDate },
          ]} />
        ) },
        { key: 'adj', label: 'Điều chỉnh', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setPicked(null); setAdjOpen(true); }} style={{ marginBottom: 12 }}>Tạo phiếu</Button>}
          <Table size="small" dataSource={adjs} rowKey="id" pagination={false} columns={[
            { title: 'Số phiếu', dataIndex: 'adjustment_number' }, { title: 'Kho', dataIndex: 'warehouse_id' },
            { title: 'Lý do', dataIndex: 'reason' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('adjust', v)}</Tag> },
            { title: '', render: (_, r) => writable && r.status === 'draft' && <Button size="small" onClick={() => postAdj(r.id)}>Chốt</Button> },
          ]} />
        </>) },
        { key: 'trf', label: 'Chuyển kho', children: (
          <Table size="small" dataSource={trfs} rowKey="id" pagination={false} columns={[
            { title: 'Số', dataIndex: 'transfer_number' }, { title: 'Từ kho', dataIndex: 'source_warehouse_id' },
            { title: 'Đến kho', dataIndex: 'destination_warehouse_id' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('transfer', v)}</Tag> },
          ]} />
        ) },
      ]} />

      <Modal title="Thêm kho" open={whOpen} width={560} okText="Lưu" cancelText="Hủy" onCancel={() => setWhOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={saveWh}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="code" label="Mã kho" rules={[{ required: true, message: 'Nhập mã' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="name" label="Tên kho" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Nhập / set tồn" open={stockOpen} width={640} okText="Lưu" cancelText="Hủy" onCancel={() => setStockOpen(false)} onOk={() => sform.submit()}>
        <Form form={sform} layout="vertical" onFinish={saveStock}>
          <Form.Item label="Biến thể">
            {picked ? <Tag color="blue">{picked.sku} · {picked.name} <a onClick={() => setPicked(null)}>đổi</a></Tag>
              : <VariantPicker onPick={(v) => setPicked(v)} />}
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="warehouse_id" label="Kho" rules={[{ required: true, message: 'Chọn kho' }]}>
              <Select options={whs.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))} />
            </Form.Item></Col>
            <Col span={6}><Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập SL' }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={6}><Form.Item name="reorder_level" label="Ngưỡng"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
      <Modal title="Phiếu điều chỉnh" open={adjOpen} width={640} okText="Lưu" cancelText="Hủy" onCancel={() => setAdjOpen(false)} onOk={() => aform.submit()}>
        <Form form={aform} layout="vertical" onFinish={saveAdj}>
          <Form.Item label="Biến thể">
            {picked ? <Tag color="blue">{picked.sku} · {picked.name} <a onClick={() => setPicked(null)}>đổi</a></Tag>
              : <VariantPicker onPick={(v) => setPicked(v)} />}
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="warehouse_id" label="Kho" rules={[{ required: true, message: 'Chọn kho' }]}>
              <Select options={whs.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="new_quantity" label="Tồn mới" rules={[{ required: true, message: 'Nhập tồn' }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          </Row>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
