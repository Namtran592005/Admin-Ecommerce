import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader, Toolbar } from '../components/ui/table';
import { Tabs, TableSearch, useRowFilter } from '../components/ui/misc';
import PageContent from './PageContent';

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
  const [menu, setMenu] = useState([]);
  const [q, setQ] = useState('');

  const load = (quiet = false) => {
    if (canSettings) api.get('/settings').then((r) => {
      setSettings(r.data);
      const m = r.data.find((x) => x.setting_key === 'shop.menu');
      if (m) {
        try {
          const v = typeof m.setting_value === 'string' ? JSON.parse(m.setting_value) : m.setting_value;
          setMenu(Array.isArray(v) ? v : []);
        } catch { /* ignore */ }
      }
    }).catch(() => {});
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
  const saveMenu = async () => {
    const clean = menu.filter((m) => m.label?.trim() && m.link?.trim());
    if (!clean.length) return toast.warning('Menu cần ít nhất 1 mục');
    try {
      await api.put('/settings/shop.menu', { value: clean });
      toast.success('Đã lưu menu shop');
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const fSettings = useRowFilter(settings, q, (r) => `${r.setting_key} ${r.description || ''}`);
  const fNotifs = useRowFilter(notifs, q, (r) => `${r.title || ''} ${r.body || ''} ${r.type || ''}`);
  const fAudits = useRowFilter(audits, q, (r) => `${r.user_email || ''} ${r.action} ${r.entity_type || ''} ${r.ip || ''}`);

  return (
    <div>
      <PageHeader title="Hệ thống" />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          ...(canSettings ? [{ key: 's', label: 'Cấu hình' }, { key: 'm', label: 'Menu shop' }, { key: 'c', label: 'Nội dung trang' }] : []),
          { key: 'n', label: 'Thông báo' },
          ...(canAudit ? [{ key: 'a', label: 'Nhật ký' }] : []),
        ]} />
        <Toolbar><TableSearch value={q} onChange={setQ} placeholder="Tìm trong bảng đang xem..." /></Toolbar>
        {tab === 's' && canSettings && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Khóa</Th><Th>Giá trị</Th><Th>Công khai</Th><Th /></Tr></THead>
            <tbody>{fSettings.map((r) => (
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
        {tab === 'm' && canSettings && (
          <>
            <p className="mb-3 text-sm text-slate-500">Menu hiện ở đầu trang bán hàng (tối đa 12 mục). Liên kết dạng <code>/san-pham?danh-muc=3</code> hoặc <code>https://...</code></p>
            {menu.map((m, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <Input placeholder="Tên mục (VD: Hàng Mới)" value={m.label || ''} className="max-w-[240px]"
                  onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input placeholder="Liên kết (VD: /san-pham)" value={m.link || ''} className="max-w-[320px]"
                  onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)))} />
                <Button size="sm" variant="outline" onClick={() => setMenu(menu.filter((_, j) => j !== i))}>Xóa</Button>
                {i > 0 && <Button size="sm" variant="ghost" onClick={() => setMenu(menu.map((x, j) => (j === i - 1 ? menu[i] : j === i ? menu[i - 1] : x)))}>↑</Button>}
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <Button variant="outline" onClick={() => setMenu([...menu, { label: '', link: '' }])}>Thêm mục</Button>
              <Button onClick={saveMenu}>Lưu menu</Button>
            </div>
          </>
        )}
        {tab === 'c' && canSettings && <PageContent />}
        {tab === 'n' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Loại</Th><Th>Tiêu đề</Th><Th>Nội dung</Th><Th>Đã đọc</Th><Th /></Tr></THead>
            <tbody>{fNotifs.map((r) => (
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
            <tbody>{fAudits.map((r) => (
              <Tr key={r.id}><Td>{r.actor_user_id}</Td><Td>{r.action}</Td><Td>{r.entity_type}</Td>
                <Td>{r.entity_id}</Td><Td>{r.ip_address}</Td><Td className="whitespace-nowrap">{fmtDate(r.created_at)}</Td></Tr>
            ))}</tbody>
          </table></TableWrap>
        )}
      </CardContent></Card>
    </div>
  );
}
