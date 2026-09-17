import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Row, Col, Radio } from 'antd';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { MediaPicker } from '../components/pickers';

function EmailComposer() {
  const [mode, setMode] = useState('manual');
  const [emails, setEmails] = useState('');
  const [allCount, setAllCount] = useState(null);
  const [allEmails, setAllEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<h3>Xin chào quý khách!</h3><p>Nội dung khuyến mãi...</p>');
  const [sending, setSending] = useState(false);
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    api.get('/email/config').then((r) => setCfg(r.data)).catch(() => setCfg({ configured: false }));
  }, []);

  const loadAll = async () => {
    try {
      const { data } = await api.get('/users', { params: { page: 1, limit: 200 } });
      const list = (data.data || []).map((u) => u.email).filter((e) => e && e.includes('@'));
      setAllEmails([...new Set(list)]);
      setAllCount(list.length);
      message.success(`Đã lấy ${list.length} email khách`);
    } catch (e) { message.error(errMsg(e)); }
  };

  const parseManual = () => [...new Set(emails.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => s.includes('@')))];
  const targets = mode === 'manual' ? parseManual() : allEmails;

  const sendTest = async () => {
    if (!emails.trim() && mode === 'manual') return message.warning('Nhập email nhận thử');
    const to = mode === 'manual' ? parseManual()[0] : (allEmails[0] || '');
    if (!to) return message.warning('Chưa có email nhận');
    try {
      await api.post('/email/test', { to });
      message.success('Đã gửi mail thử tới ' + to);
    } catch (e) { message.error(errMsg(e)); }
  };

  const send = async () => {
    if (!targets.length) return message.warning('Chưa có người nhận');
    if (!subject.trim() || !html.trim()) return message.warning('Nhập tiêu đề và nội dung');
    setSending(true);
    try {
      const { data } = await api.post('/email/send', { to: targets, subject: subject.trim(), html });
      if (data.failed?.length) message.warning(`Đã gửi ${data.sent}, lỗi ${data.failed.length}`);
      else message.success(`Đã gửi ${data.sent} email`);
    } catch (e) { message.error(errMsg(e)); }
    finally { setSending(false); }
  };

  return (
    <>
      {!cfg?.configured && <p><Tag color="red">Chưa cấu hình SMTP — liên hệ kỹ thuật (SMTP_HOST/USER/PASS)</Tag></p>}
      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} style={{ marginBottom: 12 }}>
        <Radio value="manual">Nhập tay</Radio>
        <Radio value="all">Tất cả khách có email</Radio>
      </Radio.Group>
      {mode === 'manual'
        ? <Input.TextArea rows={3} placeholder={'a@gmail.com, b@gmail.com...'} value={emails} onChange={(e) => setEmails(e.target.value)} style={{ marginBottom: 12 }} />
        : <div style={{ marginBottom: 12 }}>
          <Button onClick={loadAll}>Tải danh sách ({allCount ?? '?'})</Button>
        </div>}
      <Input placeholder="Tiêu đề email *" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ marginBottom: 12 }} />
      <Tabs size="small" items={[
        { key: 'edit', label: 'Soạn HTML', children: (
          <Input.TextArea rows={10} value={html} onChange={(e) => setHtml(e.target.value)} style={{ fontFamily: 'monospace' }} />
        ) },
        { key: 'view', label: 'Xem trước', children: (
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, minHeight: 200 }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) },
      ]} />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Button onClick={sendTest}>Gửi thử</Button>
        <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={send}>
          Gửi {targets.length ? `(${targets.length})` : ''}
        </Button>
      </div>
    </>
  );
}

export default function Marketing() {
  const { can } = useAuth();
  const writable = can('promotions.write');
  const [camps, setCamps] = useState([]);
  const [banners, setBanners] = useState([]);
  const [cOpen, setCOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [bannerMedia, setBannerMedia] = useState(null);
  const [cform] = Form.useForm();
  const [bform] = Form.useForm();
  const load = (quiet = false) => {
    api.get('/campaigns').then((r) => setCamps(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
    api.get('/banners/all').then((r) => setBanners(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveCamp = async (v) => {
    try { await api.post('/campaigns', v); message.success('Đã tạo chiến dịch'); setCOpen(false); cform.resetFields(); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const saveBanner = async (v) => {
    if (!bannerMedia) return message.warning('Chọn ảnh banner');
    try { await api.post('/banners', { ...v, image_media_id: bannerMedia }); message.success('Đã tạo banner'); setBOpen(false); bform.resetFields(); setBannerMedia(null); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'c', label: 'Chiến dịch', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCOpen(true)} style={{ marginBottom: 12 }}>Tạo chiến dịch</Button>}
          <Table size="small" dataSource={camps} rowKey="id" pagination={false} columns={[
            { title: 'Tên', dataIndex: 'name' }, { title: 'Mô tả', dataIndex: 'description' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('promo', v)}</Tag> },
          ]} />
        </>) },
        { key: 'b', label: 'Banner', children: (<>
          {writable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setBOpen(true)} style={{ marginBottom: 12 }}>Tạo banner</Button>}
          <Table size="small" dataSource={banners} rowKey="id" pagination={false} columns={[
            { title: 'Tiêu đề', dataIndex: 'title' }, { title: 'Liên kết', dataIndex: 'link_url' },
            { title: 'Ảnh', dataIndex: 'image_media_id', render: (v) => (v ? `#${v}` : '—') },
            { title: 'Sắp xếp', dataIndex: 'sort_order' },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{t('coupon', v)}</Tag> },
          ]} />
        </>) },
        { key: 'e', label: 'Gửi email', children: <EmailComposer /> },
      ]} />
      <Modal title="Tạo chiến dịch" open={cOpen} width={560} okText="Lưu" cancelText="Hủy" onCancel={() => setCOpen(false)} onOk={() => cform.submit()}>
        <Form form={cform} layout="vertical" onFinish={saveCamp}>
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={14}><Form.Item name="description" label="Mô tả"><Input /></Form.Item></Col>
            <Col span={10}><Form.Item name="status" label="Trạng thái" initialValue="draft">
              <Select options={opts('promo', ['draft', 'scheduled', 'active', 'paused', 'ended'])} />
            </Form.Item></Col>
          </Row>
        </Form>
      </Modal>
      <Modal title="Tạo banner" open={bOpen} width={640} okText="Lưu" cancelText="Hủy" onCancel={() => setBOpen(false)} onOk={() => bform.submit()}>
        <Form form={bform} layout="vertical" onFinish={saveBanner}>
          <Row gutter={12}>
            <Col span={14}><Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}><Input /></Form.Item></Col>
            <Col span={10}><Form.Item name="sort_order" label="Sắp xếp"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
          </Row>
          <Form.Item label="Ảnh" required><MediaPicker value={bannerMedia} onChange={setBannerMedia} kind="image" /></Form.Item>
          <Row gutter={12}>
            <Col span={14}><Form.Item name="link_url" label="Liên kết"><Input /></Form.Item></Col>
            <Col span={10}><Form.Item name="status" label="Trạng thái" initialValue="active">
              <Select options={opts('coupon', ['draft', 'active', 'inactive'])} />
            </Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
