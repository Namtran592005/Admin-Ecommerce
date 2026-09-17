import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { OrderPicker } from '../components/pickers';

export default function Finance() {
  const { can } = useAuth();
  const writable = can('payments.write');
  const [invs, setInvs] = useState([]);
  const [flows, setFlows] = useState([]);
  const [invOpen, setInvOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [invOrder, setInvOrder] = useState(null);
  const [iform] = Form.useForm();
  const [fform] = Form.useForm();
  const load = (quiet = false) => {
    api.get('/invoices').then((r) => setInvs(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
    api.get('/cash-flows').then((r) => setFlows(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const createInv = async (v) => {
    if (!invOrder) return message.warning('Chọn đơn hàng');
    try { await api.post('/invoices', { ...v, order_id: invOrder }); message.success('Đã tạo hóa đơn'); setInvOpen(false); iform.resetFields(); setInvOrder(null); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const invStatus = async (id, status) => {
    try { await api.patch(`/invoices/${id}/status`, { status }); message.success('Đã cập nhật'); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const createFlow = async (v) => {
    try { await api.post('/cash-flows', v); message.success('Đã ghi'); setFlowOpen(false); fform.resetFields(); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'inv', label: 'Hóa đơn', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setInvOpen(true)} style={{ marginBottom: 12 }}>Xuất hóa đơn</Button>}
          <Table size="small" dataSource={invs} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Số HĐ', dataIndex: 'invoice_number' }, { title: 'Đơn', dataIndex: 'order_id' },
            { title: 'Khách', dataIndex: 'buyer_name' },
            { title: 'Tổng', dataIndex: 'total_amount', render: fmtVND },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'issued' ? 'green' : 'default'}>{t('invoice', v)}</Tag> },
            { title: '', render: (_, r) => writable && (
              <Select size="small" style={{ width: 130 }} value={r.status} onChange={(v) => invStatus(r.id, v)}
                options={opts('invoice', ['draft', 'issued', 'cancelled'])} />
            ) },
          ]} />
        </>) },
        { key: 'flow', label: 'Dòng tiền', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setFlowOpen(true)} style={{ marginBottom: 12 }}>Ghi thu/chi</Button>}
          <Table size="small" dataSource={flows} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Loại', dataIndex: 'type', render: (v) => <Tag color={v === 'income' ? 'green' : 'red'}>{t('cash', v)}</Tag> },
            { title: 'Tham chiếu', dataIndex: 'reference_type' },
            { title: 'Số tiền', dataIndex: 'amount', render: fmtVND },
            { title: 'Diễn giải', dataIndex: 'description' },
            { title: 'Ngày', dataIndex: 'occurred_at', render: fmtDate },
          ]} />
        </>) },
      ]} />
      <Modal title="Xuất hóa đơn từ đơn hàng" open={invOpen} width={640} okText="Lưu" cancelText="Hủy" onCancel={() => setInvOpen(false)} onOk={() => iform.submit()}>
        <Form form={iform} layout="vertical" onFinish={createInv}>
          <Form.Item label="Đơn hàng" required><OrderPicker value={invOrder} onChange={setInvOrder} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="buyer_name" label="Người mua"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="buyer_company_name" label="Công ty"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="buyer_tax_code" label="Mã số thuế"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="buyer_email" label="Email"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="buyer_address" label="Địa chỉ"><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Ghi thu/chi" open={flowOpen} width={560} okText="Lưu" cancelText="Hủy" onCancel={() => setFlowOpen(false)} onOk={() => fform.submit()}>
        <Form form={fform} layout="vertical" onFinish={createFlow}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="type" label="Loại" initialValue="expense">
              <Select options={opts('cash', ['income', 'expense', 'refund', 'shipping_cost', 'purchase', 'adjustment'])} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="amount" label="Số tiền" rules={[{ required: true, message: 'Nhập số tiền' }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Diễn giải"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
