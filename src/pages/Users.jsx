import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts, roleVI } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, Toolbar, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';
const isStaff = (roles) => (roles || '').split(',').some((r) => r && r !== 'customer');

export default function Users() {
  const { can } = useAuth();
  const writable = can('users.write');
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, limit: 30, total: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('customer');
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [sel, setSel] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [sf, setSf] = useState({ role_code: 'store_manager' });

  const load = async (page = 1, quiet = false) => {
    try {
      const { data } = await api.get('/users', { params: { page, limit: 30, search } });
      setRows(data.data); setPg({ page, limit: 30, total: data.pagination.total });
    } catch (e) { if (!quiet) toast.error(errMsg(e)); }
  };
  useEffect(() => {
    load(1);
    api.get('/users/meta/roles').then((r) => setRoles(r.data)).catch(() => {});
    api.get('/users/meta/permissions').then((r) => setPerms(r.data)).catch(() => {});
  }, []);

  const shown = rows.filter((r) => (tab === 'staff' ? isStaff(r.roles) : !isStaff(r.roles)));

  const open = async (id) => {
    try { const { data } = await api.get(`/users/${id}`); setSel(data); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const setStatus = async (id, status) => {
    try { await api.patch(`/users/${id}/status`, { status }); toast.success('Đã cập nhật'); load(pg.page, true); setSel(null); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const grantRole = async (id, role_code) => {
    try { await api.post(`/users/${id}/roles`, { role_code }); toast.success('Đã gán vai trò'); open(id); load(pg.page, true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const addStaff = async () => {
    if (!sf.password || sf.password.length < 8) return toast.error('Mật khẩu tối thiểu 8 ký tự');
    if (!sf.email && !sf.phone) return toast.error('Nhập email hoặc SĐT');
    try { await api.post('/users', sf); toast.success('Đã thêm nhân sự'); setStaffOpen(false); setSf({ role_code: 'store_manager' }); load(1, true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const setS = (k, v) => setSf((x) => ({ ...x, [k]: v }));

  return (
    <div>
      <PageHeader title="Người dùng & Phân quyền"
        actions={writable && tab === 'staff' && <Button onClick={() => setStaffOpen(true)}><Plus />Thêm nhân sự</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'customer', label: 'Khách hàng' }, { key: 'staff', label: 'Nhân sự' }, { key: 'roles', label: 'Vai trò & Quyền' },
        ]} />
        {tab !== 'roles' && (<>
          <Toolbar>
            <Input placeholder="Email / SĐT..." value={search} className="max-w-[260px]"
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
            <Button onClick={() => load(1)}>Tìm</Button>
          </Toolbar>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>ID</Th><Th>Email</Th><Th>SĐT</Th><Th>Vai trò</Th><Th>Trạng thái</Th><Th /></Tr></THead>
            <tbody>{shown.map((r) => (
              <Tr key={r.id}>
                <Td>{r.id}</Td><Td>{r.email}</Td><Td>{r.phone}</Td>
                <Td><div className="flex flex-wrap gap-1">{(r.roles || '').split(',').filter(Boolean).map((x) => <Badge key={x} color="blue">{roleVI(x)}</Badge>)}</div></Td>
                <Td><Badge color={r.status === 'active' ? 'green' : 'red'}>{t('user', r.status)}</Badge></Td>
                <Td><Button size="sm" variant="outline" onClick={() => open(r.id)}>Chi tiết</Button></Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!shown.length && <Empty />}
          {sel && (
            <div className="mt-3 rounded-lg border p-3 text-sm">
              <div className="mb-2 font-semibold">#{sel.user.id} {sel.user.email || sel.user.phone}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div><span className="text-slate-500">Vai trò: </span>{(sel.roles || []).map((r) => roleVI(r.code)).join(', ')}</div>
                <div><span className="text-slate-500">Trạng thái: </span>{t('user', sel.user.status)}</div>
                {writable && (
                  <div className="flex flex-wrap gap-1.5">
                    <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" defaultValue=""
                      onChange={(e) => e.target.value && setStatus(sel.user.id, e.target.value)}>
                      <option value="">Đổi trạng thái...</option>
                      {opts('user', ['pending', 'active', 'inactive', 'suspended']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" defaultValue=""
                      onChange={(e) => e.target.value && grantRole(sel.user.id, e.target.value)}>
                      <option value="">Gán vai trò...</option>
                      {roles.map((r) => <option key={r.code} value={r.code}>{roleVI(r.code)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </>)}
        {tab === 'roles' && (<>
          <h4 className="mb-2 text-sm font-semibold">Vai trò ({roles.length})</h4>
          <div className="mb-3 flex flex-wrap gap-1.5">{roles.map((r) => <Badge key={r.id} color="blue" title={r.code}>{roleVI(r.code)}</Badge>)}</div>
          <h4 className="mb-2 text-sm font-semibold">Quyền ({perms.length})</h4>
          <div className="flex flex-wrap gap-1.5">{perms.map((p) => <Badge key={p.id} title={p.code}>{p.name === 'Xem audit log' ? 'Xem nhật ký' : (p.name || p.code)}</Badge>)}</div>
        </>)}
      </CardContent></Card>

      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Thêm nhân sự</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email"><Input value={sf.email || ''} onChange={(e) => setS('email', e.target.value)} /></Field>
            <Field label="SĐT"><Input value={sf.phone || ''} onChange={(e) => setS('phone', e.target.value)} /></Field>
            <Field label="Mật khẩu *"><Input type="password" value={sf.password || ''} onChange={(e) => setS('password', e.target.value)} /></Field>
            <Field label="Vai trò *">
              <select className={inputCls} value={sf.role_code} onChange={(e) => setS('role_code', e.target.value)}>
                {roles.filter((r) => r.code !== 'customer').map((r) => <option key={r.code} value={r.code}>{roleVI(r.code)}</option>)}
              </select>
            </Field>
            <Field label="Tên"><Input value={sf.first_name || ''} onChange={(e) => setS('first_name', e.target.value)} /></Field>
            <Field label="Họ"><Input value={sf.last_name || ''} onChange={(e) => setS('last_name', e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffOpen(false)}>Hủy</Button>
            <Button onClick={addStaff}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
