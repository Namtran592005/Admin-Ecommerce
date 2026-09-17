import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Descriptions, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { OrderPicker } from '../components/pickers';

export default function Payments() {
  const { can } = useAuth();
  const writable = can('payments.write');
  const [pays, setPays] = useState([]);
  const [refs, setRefs] = useState([]);
  const [methods, setMethods] = useState([]);
  const [sel, setSel] = useState(null);
  const [refOpen, setRefOpen] = useState(false);
  const [refOrder, setRefOrder] = useState(null);
  const [form] = Form.useForm();
  const load = (quiet = false) => {
    api.get('/payments').then((r) => setPays(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
    api.get('/payments/refunds/list').then((r) => setRefs(r.data)).catch(() => {});
    api.get('/payments/methods').then((r) => setMethods(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const open = async (id) => {
    try { const { data } = await api.get(`/payments/${id}`); setSel(data); }
    catch (e) { message.error(errMsg(e)); }
  };
  const markPaid = async (id) => {
    try { await api.post(`/payments/${id}/mark-paid`); message.success('Đã gạch đã thu'); load(true); setSel(null); }
    catch (e) { message.error(errMsg(e)); }
  };
  const createRefund = async (v) => {
    if (!refOrder) return message.warning('Chọn đơn hàng');
    try { await api.post('/payments/refunds', { ...v, order_id: refOrder }); message.success('Đã tạo yêu cầu hoàn tiền'); setRefOpen(false); form.resetFields(); setRefOrder(null); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const refundStatus = async (id, status) => {
    try { await api.patch(`/payments/refunds/${id}/status`, { status }); message.success('Đã cập nhật'); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'pay', label: 'Thanh toán', children: (
          <Table size="small" dataSource={pays} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'ID', dataIndex: 'id' }, { title: 'Đơn', dataIndex: 'order_id' },
            { title: 'Phương thức', dataIndex: 'method_code', render: (v) => t('paymethod', v) },
            { title: 'Số tiền', dataIndex: 'amount', render: fmtVND },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'paid' ? 'green' : v === 'failed' ? 'red' : 'default'}>{t('payment', v)}</Tag> },
            { title: 'Đã thu', dataIndex: 'paid_at', render: fmtDate },
            { title: '', render: (_, r) => <>
              <Button size="small" onClick={() => open(r.id)}>Chi tiết</Button>{' '}
              {writable && r.status !== 'paid' && <Button size="small" type="primary" onClick={() => markPaid(r.id)}>Gạch đã thu</Button>}
            </> },
          ]} />
        ) },
        { key: 'ref', label: 'Hoàn tiền', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setRefOpen(true)} style={{ marginBottom: 12 }}>Tạo hoàn tiền</Button>}
          <Table size="small" dataSource={refs} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Số', dataIndex: 'refund_number' }, { title: 'Đơn', dataIndex: 'order_id' },
            { title: 'Số tiền', dataIndex: 'amount', render: fmtVND },
            { title: 'Lý do', dataIndex: 'reason' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('refund', v)}</Tag> },
            { title: '', render: (_, r) => writable && (
              <Select size="small" placeholder="Đổi trạng thái" style={{ width: 150 }} value={r.status}
                onChange={(v) => refundStatus(r.id, v)} options={opts('refund', ['requested', 'approved', 'processing', 'completed', 'failed', 'cancelled'])} />
            ) },
          ]} />
        </>) },
        { key: 'm', label: 'Phương thức', children: (
          <Table size="small" dataSource={methods} rowKey="id" pagination={false} columns={[
            { title: 'Mã', dataIndex: 'code' }, { title: 'Tên', dataIndex: 'name' },
            { title: 'Loại', dataIndex: 'type', render: (v) => t('paymethod', v) },
            { title: 'Bật', dataIndex: 'is_active', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag> },
          ]} />
        ) },
      ]} />

      <Modal title="Chi tiết thanh toán" open={!!sel} onCancel={() => setSel(null)} footer={null} width={640}>
        {sel && (<>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Đơn">{sel.order_id}</Descriptions.Item>
            <Descriptions.Item label="Số tiền">{fmtVND(sel.amount)}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{t('payment', sel.status)}</Descriptions.Item>
            <Descriptions.Item label="Đã thu">{fmtDate(sel.paid_at)}</Descriptions.Item>
          </Descriptions>
          <h4 style={{ marginTop: 12 }}>Giao dịch ({sel.transactions.length})</h4>
          <Table size="small" pagination={false} dataSource={sel.transactions} rowKey="id" columns={[
            { title: 'Loại', dataIndex: 'transaction_type', render: (v) => t('paytype', v) },
            { title: 'Kết quả', dataIndex: 'status', render: (v) => <Tag>{t('txtype', v)}</Tag> },
            { title: 'Số tiền', dataIndex: 'amount', render: fmtVND },
            { title: 'Mã chống trùng', dataIndex: 'idempotency_key' },
          ]} />
        </>)}
      </Modal>
      <Modal title="Tạo hoàn tiền" open={refOpen} width={560} okText="Lưu" cancelText="Hủy" onCancel={() => setRefOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={createRefund}>
          <Form.Item label="Đơn hàng" required><OrderPicker value={refOrder} onChange={setRefOrder} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="amount" label="Số tiền" rules={[{ required: true, message: 'Nhập số tiền' }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            <Col span={12}><Form.Item name="reason" label="Lý do"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
