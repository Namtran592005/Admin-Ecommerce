import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg } from '../api/client';

function Crud({ title, listUrl, createUrl, columns, formFields, onSaved }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const load = () => api.get(listUrl).then((r) => setRows(Array.isArray(r.data) ? r.data : r.data.data || [])).catch((e) => message.error(errMsg(e)));
  useEffect(() => { load(); }, []);
  const save = async (v) => {
    try { await api.post(createUrl, v); message.success('Đã thêm ' + title); setOpen(false); form.resetFields(); load(); onSaved?.(); }
    catch (e) { message.error(errMsg(e)); }
  };
  return (
    <>
      <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 12 }}>Thêm {title}</Button>
      <Table size="small" dataSource={rows} rowKey="id" columns={columns} pagination={{ pageSize: 10 }} />
      <Modal title={'Thêm ' + title} open={open} okText="Lưu" cancelText="Hủy" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save}>{formFields}</Form>
      </Modal>
    </>
  );
}

export default function Catalog() {
  const [attrs, setAttrs] = useState([]);
  const [attrId, setAttrId] = useState(null);
  const [valForm] = Form.useForm();
  const loadAttrs = () => api.get('/attributes').then((r) => setAttrs(r.data)).catch(() => {});
  useEffect(() => { loadAttrs(); }, []);

  const addAttrValue = async (v) => {
    if (!attrId) return message.warning('Chọn thuộc tính trước');
    try { await api.post(`/attributes/${attrId}/values`, v); message.success('Đã thêm giá trị'); valForm.resetFields(); loadAttrs(); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        { key: 'cat', label: 'Danh mục', children: (
          <Crud title="danh mục" listUrl="/categories" createUrl="/categories"
            columns={[
              { title: 'ID', dataIndex: 'id' }, { title: 'Tên', dataIndex: 'name' },
              { title: 'Đường dẫn', dataIndex: 'slug' }, { title: 'Cha', dataIndex: 'parent_id' },
              { title: 'Sắp xếp', dataIndex: 'sort_order' },
              { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
            ]}
            formFields={<>
              <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="parent_id" label="Danh mục cha (ID)"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="sort_order" label="Sắp xếp"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </>} />
        ) },
        { key: 'brand', label: 'Thương hiệu', children: (
          <Crud title="thương hiệu" listUrl="/brands" createUrl="/brands"
            columns={[
              { title: 'ID', dataIndex: 'id' }, { title: 'Tên', dataIndex: 'name' },
              { title: 'Đường dẫn', dataIndex: 'slug' },
              { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
            ]}
            formFields={<>
              <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
            </>} />
        ) },
        { key: 'attr', label: 'Thuộc tính', children: (
          <>
            <Space style={{ marginBottom: 12 }}>
              <Select placeholder="Chọn thuộc tính để thêm giá trị" style={{ width: 260 }} value={attrId}
                onChange={setAttrId} options={attrs.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))} />
            </Space>
            {attrs.map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <b>{a.name}</b> <Tag>{a.code}</Tag>:{' '}
                {(a.values || []).map((v) => <Tag key={v.id}>{v.display_value || v.value}</Tag>)}
              </div>
            ))}
            <Form form={valForm} layout="inline" onFinish={addAttrValue} style={{ marginTop: 8 }}>
              <Form.Item name="value" rules={[{ required: true }]}><Input placeholder="Giá trị (M...)" /></Form.Item>
              <Form.Item name="display_value"><Input placeholder="Tên hiển thị" /></Form.Item>
              <Form.Item name="color_hex"><Input placeholder="#ff0000 (nếu màu)" /></Form.Item>
              <Button htmlType="submit">Thêm giá trị</Button>
            </Form>
          </>
        ) },
      ]} />
    </div>
  );
}
