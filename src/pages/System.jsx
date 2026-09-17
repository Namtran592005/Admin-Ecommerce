import { useEffect, useState } from 'react';
import { Tabs, Table, Tag, message, Input, Button } from 'antd';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function System() {
  const { can } = useAuth();
  const canSettings = can('settings.write');
  const canAudit = can('audit.read');
  const [settings, setSettings] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [audits, setAudits] = useState([]);
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState('');

  const load = () => {
    if (canSettings) api.get('/settings').then((r) => setSettings(r.data)).catch(() => {});
    api.get('/notifications').then((r) => setNotifs(r.data)).catch(() => {});
    if (canAudit) api.get('/audit-logs').then((r) => setAudits(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveSetting = async () => {
    try {
      let value;
      try { value = JSON.parse(editVal); } catch { value = editVal; }
      await api.put(`/settings/${editKey}`, { value });
      message.success('Đã lưu'); setEditKey(null); load();
    } catch (e) { message.error(errMsg(e)); }
  };
  const markRead = async (id) => {
    try { await api.patch(`/notifications/${id}/read`); load(); }
    catch (e) { message.error(errMsg(e)); }
  };

  return (
    <div className="page-card">
      <Tabs items={[
        ...(canSettings ? [{ key: 's', label: 'Cấu hình', children: (
          <Table size="small" dataSource={settings} rowKey="setting_key" pagination={false} columns={[
            { title: 'Khóa', dataIndex: 'setting_key' },
            { title: 'Giá trị', dataIndex: 'setting_value', render: (v) => <code>{JSON.stringify(v)}</code> },
            { title: 'Công khai', dataIndex: 'is_public', render: (v) => v ? <Tag color="green">Có</Tag> : '—' },
            { title: '', render: (_, r) => editKey === r.setting_key ? (<>
              <Input value={editVal} onChange={(e) => setEditVal(e.target.value)} style={{ width: 200 }} />{' '}
              <Button size="small" type="primary" onClick={saveSetting}>Lưu</Button>
            </>) : <Button size="small" onClick={() => { setEditKey(r.setting_key); setEditVal(JSON.stringify(r.setting_value)); }}>Sửa</Button> },
          ]} />
        ) }] : []),
        { key: 'n', label: 'Thông báo', children: (
          <Table size="small" dataSource={notifs} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Loại', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
            { title: 'Tiêu đề', dataIndex: 'title' }, { title: 'Nội dung', dataIndex: 'body' },
            { title: 'Đã đọc', dataIndex: 'read_at', render: (v) => v ? fmtDate(v) : <Tag color="orange">Chưa</Tag> },
            { title: '', render: (_, r) => !r.read_at && <Button size="small" onClick={() => markRead(r.id)}>Đánh dấu đã đọc</Button> },
          ]} />
        ) },
        ...(canAudit ? [{ key: 'a', label: 'Nhật ký', children: (
          <Table size="small" dataSource={audits} rowKey="id" pagination={{ pageSize: 12 }} columns={[
            { title: 'Người', dataIndex: 'actor_user_id' }, { title: 'Hành động', dataIndex: 'action' },
            { title: 'Đối tượng', dataIndex: 'entity_type' }, { title: 'ID', dataIndex: 'entity_id' },
            { title: 'Địa chỉ IP', dataIndex: 'ip_address' }, { title: 'Lúc', dataIndex: 'created_at', render: fmtDate },
          ]} />
        ) }] : []),
      ]} />
    </div>
  );
}
