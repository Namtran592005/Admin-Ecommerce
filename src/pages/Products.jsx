import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Space, Upload, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';

export default function Products() {
  const { can } = useAuth();
  const writable = can('products.write');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pg, setPg] = useState({ page: 1, limit: 15, total: 0 });
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form] = Form.useForm();
  const [vform] = Form.useForm();

  const load = async (page = 1, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/products', { params: { page, limit: pg.limit, search } });
      setRows(data.data); setPg({ page, limit: pg.limit, total: data.pagination.total });
    } catch (e) { if (!quiet) message.error(errMsg(e)); } finally { if (!quiet) setLoading(false); }
  };
  useEffect(() => {
    api.get('/brands').then((r) => setBrands(r.data)).catch(() => {});
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
    load(1);
  }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(pg.page, true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const openDetail = async (id, quiet = false) => {
    try { const { data } = await api.get(`/products/${id}`); setDetail(data); }
    catch (e) { if (!quiet) message.error(errMsg(e)); }
  };

  const save = async (v) => {
    try {
      if (editing?.id) await api.put(`/products/${editing.id}`, v);
      else await api.post('/products', { status: 'active', ...v });
      message.success('Đã lưu sản phẩm');
      setEditing(null); form.resetFields(); load(pg.page, true);
    } catch (e) { message.error(errMsg(e)); }
  };

  const addVariant = async (v) => {
    try {
      await api.post(`/products/${detail.id}/variants`, v);
      message.success('Đã thêm biến thể');
      vform.resetFields(); openDetail(detail.id, true); load(pg.page, true);
    } catch (e) { message.error(errMsg(e)); }
  };

  const viewImage = async (mediaId) => {
    try {
      const { data } = await api.get(`/media/${mediaId}/url`);
      window.open(data.url, '_blank');
    } catch (e) { message.error(errMsg(e)); }
  };

  const uploadImage = async (file, primary) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: m } = await api.post('/media/upload', fd);
      await api.post(`/products/${detail.id}/images`, { media_id: m.id, is_primary: !!primary });
      message.success('Đã thêm ảnh');
      openDetail(detail.id, true);
    } catch (e) { message.error(errMsg(e)); }
    return false;
  };

  return (
    <div className="page-card">
      <div className="toolbar">
        <Input.Search placeholder="Tên / SKU..." style={{ width: 260 }} value={search}
          onChange={(e) => setSearch(e.target.value)} onSearch={() => load(1)} />
        <Button type="primary" onClick={() => load(1)}>Tìm</Button>
        {writable && <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditing({}); form.resetFields(); }}>Thêm sản phẩm</Button>}
      </div>
      <Table loading={loading} dataSource={rows} rowKey="id"
        pagination={{ current: pg.page, pageSize: pg.limit, total: pg.total, onChange: (p) => load(p) }}
        columns={[
          { title: 'Tên', dataIndex: 'name', render: (v, r) => <a onClick={() => openDetail(r.id)}>{v}</a> },
          { title: 'Thương hiệu', dataIndex: 'brand_name' },
          { title: 'Giá gốc', dataIndex: 'base_price', render: fmtVND },
          { title: 'Biến thể', dataIndex: 'variant_count' },
          { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{t('product', v)}</Tag> },
          { title: '', render: (_, r) => <Space>
            <Button onClick={() => openDetail(r.id)}>Chi tiết</Button>
            {writable && <Button icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ ...r, category_ids: [] }); }}>Sửa</Button>}
          </Space> },
        ]} />

      <Modal title={editing?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} open={!!editing} width={680}
        okText="Lưu" cancelText="Hủy" onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Row gutter={12}>
            <Col span={14}><Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item></Col>
            <Col span={10}><Form.Item name="sku" label="SKU"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="base_price" label="Giá gốc (VND)" rules={[{ required: true, message: 'Nhập giá' }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="brand_id" label="Thương hiệu"><Select allowClear options={brands.map((b) => ({ value: b.id, label: b.name }))} /></Form.Item></Col>
            <Col span={8}><Form.Item name="status" label="Trạng thái" initialValue="active"><Select options={opts('product', ['draft', 'active', 'inactive', 'archived'])} /></Form.Item></Col>
          </Row>
          <Form.Item name="category_ids" label="Danh mục"><Select mode="multiple" options={cats.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
          <Form.Item name="short_description" label="Mô tả ngắn"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={detail && `Sản phẩm: ${detail.name}`} width={800} open={!!detail}
        onCancel={() => setDetail(null)} footer={null}>
        {detail && (
          <>
            <h4>Biến thể ({detail.variants.length})</h4>
            <Table size="small" pagination={false} dataSource={detail.variants} rowKey="id" columns={[
              { title: 'SKU', dataIndex: 'sku' }, { title: 'Tên', dataIndex: 'name' },
              { title: 'Giá', dataIndex: 'price', render: fmtVND },
              { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('variant', v)}</Tag> },
            ]} />
            {writable && (
              <Form form={vform} layout="inline" onFinish={addVariant} style={{ marginTop: 8 }}>
                <Form.Item name="sku" rules={[{ required: true, message: 'Nhập SKU' }]}><Input placeholder="SKU" /></Form.Item>
                <Form.Item name="name"><Input placeholder="Tên (Size M...)" /></Form.Item>
                <Form.Item name="price" rules={[{ required: true, message: 'Nhập giá' }]}><InputNumber placeholder="Giá" min={0} /></Form.Item>
                <Button htmlType="submit" icon={<PlusOutlined />}>Thêm biến thể</Button>
              </Form>
            )}
            <h4 style={{ marginTop: 16 }}>Ảnh ({detail.images.length})</h4>
            <Space wrap>
              {detail.images.map((im) => (
                <Tag key={im.id} style={{ padding: '4px 8px' }}>
                  <a onClick={() => viewImage(im.media_id)}>Ảnh #{im.media_id}</a>{im.is_primary ? ' ★' : ''}
                </Tag>
              ))}
            </Space>
            {writable && (
              <div style={{ marginTop: 8 }}>
                <Upload beforeUpload={(f) => uploadImage(f, detail.images.length === 0)} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
                </Upload>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
