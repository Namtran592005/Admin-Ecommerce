import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Input, Select, Tag, message, Descriptions, Modal, Form, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';

const isStaff = (roles) => (roles || '').split(',').some((r) => r && r !== 'customer');

export default function Users() {
  const { can } = useAuth();
  const writable = can('users.write');
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, limit: 15, total: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('customer');
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [sel, setSel] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async (page = 1, quiet = false) => {
    try {
      const { data } = await api.get('/users', { params: { page, limit: 30, search } });
      setRows(data.data); setPg({ page, limit: 30, total: data.pagination.total });
    } catch (e) { if (!quiet) message.error(errMsg(e)); }
  };
  useEffect(() => {
    load(1);
    api.get('/users/meta/roles').then((r) => setRoles(r.data)).catch(() => {});
    api.get('/users/meta/permissions').then((r) => setPerms(r.data)).catch(() => {});
  }, []);

  const customers = rows.filter((r) => !isStaff(r.roles));
  const staff = rows.filter((r) => isStaff(r.roles));
  const shown = tab === 'customer' ? customers : staff;

  const open = async (id) => {
    try { const { data } = await api.get(`/users/${id}`); setSel(data); }
    catch (e) { message.error(errMsg(e)); }
  };
  const setStatus = async (id, status) => {
    try { await api.patch(`/users/${id}/status`, { status }); message.success('Đã cập nhật'); load(pg.page, true); setSel(null); }
    catch (e) { message.error(errMsg(e)); }
  };
  const grantRole = async (id, role_code) => {
    try { await api.post(`/users/${id}/roles`, { role_code }); message.success('Đã gán vai trò'); open(id); load(pg.page, true); }
    catch (e) { message.error(errMsg(e)); }
  };
  const addStaff = async (v) => {
    try { await api.post('/users', v); message.success('Đã thêm nhân sự'); setStaffOpen(false); form.resetFields(); load(1, true); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'customer', label: `Khách hàng (${pg.total ? customers.length : 0})`, children: null },
        { key: 'staff', label: `Nhân sự (${pg.total ? staff.length : 0})`, children: null },
        { key: 'roles', label: 'Vai trò & Quyền', children: null },
      ]} />
      {tab !== 'roles' && (
        <>
          <div className="toolbar">
            <Input.Search placeholder="Email / SĐT..." style={{ width: 260 }} value={search}
              onChange={(e) => setSearch(e.target.value)} onSearch={() => load(1)} />
            <Button type="primary" onClick={() => load(1)}>Tìm</Button>
            {writable && tab === 'staff' && <Button icon={<PlusOutlined />} type="primary" onClick={() => setStaffOpen(true)}>Thêm nhân sự</Button>}
          </div>
          <Table dataSource={shown} rowKey="id" pagination={false} columns={[
            { title: 'ID', dataIndex: 'id' }, { title: 'Email', dataIndex: 'email' },
            { title: 'SĐT', dataIndex: 'phone' },
            { title: 'Vai trò', dataIndex: 'roles', render: (v) => (v || '').split(',').filter(Boolean).map((r) => <Tag key={r} color="blue">{r}</Tag>) },
            { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{t('user', v)}</Tag> },
            { title: '', render: (_, r) => <Button size="small" onClick={() => open(r.id)}>Chi tiết</Button> },
          ]} />
          {sel && (
            <Descriptions title={`#${sel.user.id} ${sel.user.email || sel.user.phone}`} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Vai trò">{(sel.roles || []).map((r) => r.code).join(', ')}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{t('user', sel.user.status)}</Descriptions.Item>
              <Descriptions.Item label="Thao tác">
                {writable && (
                  <>
                    <Select size="small" placeholder="Đổi trạng thái" style={{ width: 150 }}
                      onChange={(v) => setStatus(sel.user.id, v)} options={opts('user', ['pending', 'active', 'inactive', 'suspended'])} />{' '}
                    <Select size="small" placeholder="Gán vai trò" style={{ width: 180 }}
                      onChange={(v) => grantRole(sel.user.id, v)}
                      options={roles.map((r) => ({ value: r.code, label: `${r.code} — ${r.name}` }))} />
                  </>
                )}
              </Descriptions.Item>
            </Descriptions>
          )}
        </>
      )}
      {tab === 'roles' && (<>
        <h4>Vai trò ({roles.length})</h4>
        {roles.map((r) => <Tag key={r.id} color="blue" style={{ margin: 4 }}>{r.code} — {r.name}</Tag>)}
        <h4 style={{ marginTop: 12 }}>Quyền ({perms.length})</h4>
        {perms.map((p) => <Tag key={p.id} style={{ margin: 4 }}>{p.code}</Tag>)}
      </>)}

      <Modal title="Thêm nhân sự" open={staffOpen} width={640} okText="Lưu" cancelText="Hủy"
        onCancel={() => setStaffOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={addStaff}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email sai' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="SĐT"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 8, message: 'Tối thiểu 8 ký tự' }]}><Input.Password /></Form.Item></Col>
            <Col span={12}><Form.Item name="role_code" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]} initialValue="store_manager">
              <Select options={roles.filter((r) => r.code !== 'customer').map((r) => ({ value: r.code, label: `${r.code} — ${r.name}` }))} />
            </Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="first_name" label="Tên"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="last_name" label="Họ"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
