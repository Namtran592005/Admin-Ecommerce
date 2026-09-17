import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, DatePicker, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';

export default function Promotions() {
  const { can } = useAuth();
  const writable = can('promotions.write');
  const [promos, setPromos] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [redems, setRedems] = useState([]);
  const [cOpen, setCOpen] = useState(false);
  const [form] = Form.useForm();
  const load = (quiet = false) => {
    api.get('/promos/promotions').then((r) => setPromos(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
    api.get('/promos/coupons').then((r) => setCoupons(r.data)).catch(() => {});
    api.get('/promos/redemptions').then((r) => setRedems(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveCoupon = async (v) => {
    const body = { ...v };
    if (v.range) { body.starts_at = v.range[0].format('YYYY-MM-DD HH:mm:ss'); body.expires_at = v.range[1].format('YYYY-MM-DD HH:mm:ss'); delete body.range; }
    try { await api.post('/promos/coupons', { status: 'active', ...body }); message.success('Đã tạo coupon'); setCOpen(false); form.resetFields(); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'cp', label: 'Mã giảm giá', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCOpen(true)} style={{ marginBottom: 12 }}>Tạo coupon</Button>}
          <Table size="small" dataSource={coupons} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Mã', dataIndex: 'code', render: (v) => <Tag color="gold">{v}</Tag> },
            { title: 'Loại', dataIndex: 'type', render: (v) => ({ fixed: 'Giảm tiền', percentage: 'Giảm %', free_shipping: 'Miễn ship' }[v] || v) },
            { title: 'Giá trị', dataIndex: 'value' },
            { title: 'Đơn tối thiểu', dataIndex: 'minimum_order_amount', render: fmtVND },
            { title: 'Đã dùng', dataIndex: 'used_count' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{t('coupon', v)}</Tag> },
            { title: 'Hết hạn', dataIndex: 'expires_at', render: fmtDate },
          ]} />
        </>) },
        { key: 'pr', label: 'Chương trình KM', children: (
          <Table size="small" dataSource={promos} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Tên', dataIndex: 'name' }, { title: 'Mã', dataIndex: 'code' },
            { title: 'Loại', dataIndex: 'type' },
            { title: 'Giá trị', dataIndex: 'value' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('promo', v)}</Tag> },
          ]} />
        ) },
        { key: 'rd', label: 'Lượt dùng coupon', children: (
          <Table size="small" dataSource={redems} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Mã', dataIndex: 'coupon_id' }, { title: 'Khách', dataIndex: 'user_id' },
            { title: 'Đơn', dataIndex: 'order_id' },
            { title: 'Giảm', dataIndex: 'discount_amount', render: fmtVND },
            { title: 'Lúc', dataIndex: 'created_at', render: fmtDate },
          ]} />
        ) },
      ]} />
      <Modal title="Tạo coupon" open={cOpen} width={640} okText="Lưu" cancelText="Hủy" onCancel={() => setCOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={saveCoupon}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Nhập mã' }]}><Input placeholder="SALE10" /></Form.Item></Col>
            <Col span={12}><Form.Item name="type" label="Loại" initialValue="percentage"><Select options={[{ value: 'fixed', label: 'Giảm tiền' }, { value: 'percentage', label: 'Giảm %' }, { value: 'free_shipping', label: 'Miễn ship' }]} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="value" label="Giá trị" rules={[{ required: true, message: 'Nhập giá trị' }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="minimum_order_amount" label="Đơn tối thiểu"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="maximum_discount_amount" label="Giảm tối đa"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="usage_limit" label="Giới hạn lượt"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            <Col span={12}><Form.Item name="range" label="Thời gian"><DatePicker.RangePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
