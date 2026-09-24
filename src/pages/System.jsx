import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';

export default function System() {
  const { can } = useAuth();
  const canSettings = can('settings.write');
  const canAudit = can('audit.read');
  const [tab, setTab] = useState(canSettings ? 's' : 'n');
  const [settings, setSettings] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [audits, setAudits] = useState([]);
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState('');

  const load = (quiet = false) => {
    if (canSettings) api.get('/settings').then((r) => setSettings(r.data)).catch(() => {});
    api.get('/notifications').then((r) => setNotifs(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    if (canAudit) api.get('/audit-logs').then((r) => setAudits(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 60000);
    return () => clearInterval(id);
  }, []);

  const saveSetting = async () => {
    try {
      let value;
      try { value = JSON.parse(editVal); } catch { value = editVal; }
      await api.put(`/settings/${editKey}`, { value });
      toast.success('Đã lưu'); setEditKey(null); load(true);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const markRead = async (id) => {
    try { await api.patch(`/notifications/${id}/read`); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Hệ thống" />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          ...(canSettings ? [{ key: 's', label: 'Cấu hình' }] : []),
          { key: 'n', label: 'Thông báo' },
          ...(canAudit ? [{ key: 'a', label: 'Nhật ký' }] : []),
        ]} />
        {tab === 's' && canSettings && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Khóa</Th><Th>Giá trị</Th><Th>Công khai</Th><Th /></Tr></THead>
            <tbody>{settings.map((r) => (
              <Tr key={r.setting_key}>
                <Td className="font-mono text-xs">{r.setting_key}</Td>
                <Td>{editKey === r.setting_key
                  ? <Input value={editVal} onChange={(e) => setEditVal(e.target.value)} className="max-w-[240px]" />
                  : <code className="text-xs">{JSON.stringify(r.setting_value)}</code>}</Td>
                <Td>{r.is_public ? <Badge color="green">Có</Badge> : '—'}</Td>
                <Td>{editKey === r.setting_key
                  ? <div className="flex gap-1.5"><Button size="sm" onClick={saveSetting}>Lưu</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditKey(null)}>Hủy</Button></div>
                  : <Button size="sm" variant="outline" onClick={() => { setEditKey(r.setting_key); setEditVal(JSON.stringify(r.setting_value)); }}>Sửa</Button>}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
        )}
        {tab === 'n' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Loại</Th><Th>Tiêu đề</Th><Th>Nội dung</Th><Th>Đã đọc</Th><Th /></Tr></THead>
            <tbody>{notifs.map((r) => (
              <Tr key={r.id}>
                <Td><Badge>{r.type}</Badge></Td><Td>{r.title}</Td><Td>{r.body}</Td>
                <Td>{r.read_at ? fmtDate(r.read_at) : <Badge color="orange">Chưa</Badge>}</Td>
                <Td>{!r.read_at && <Button size="sm" variant="outline" onClick={() => markRead(r.id)}>Đánh dấu đã đọc</Button>}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!notifs.length && <Empty />}</>
        )}
        {tab === 'a' && canAudit && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Người</Th><Th>Hành động</Th><Th>Đối tượng</Th><Th>ID</Th><Th>Địa chỉ IP</Th><Th>Lúc</Th></Tr></THead>
            <tbody>{audits.map((r) => (
              <Tr key={r.id}><Td>{r.actor_user_id}</Td><Td>{r.action}</Td><Td>{r.entity_type}</Td>
                <Td>{r.entity_id}</Td><Td>{r.ip_address}</Td><Td className="whitespace-nowrap">{fmtDate(r.created_at)}</Td></Tr>
            ))}</tbody>
          </table></TableWrap>
        )}
      </CardContent></Card>
    </div>
  );
}
