import { useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { opts, roleVI } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Select, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, Pagination, Toolbar, PageHeader } from '../components/ui/table';
import { ConfirmDialog, IconButton, RowActions, StatusBadge, Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const isStaff = (roles) => (roles || '').split(',').some((role) => role && role !== 'customer');
const toDateInput = (value) => value ? String(value).slice(0, 10) : '';
const USER_STATUSES = ['pending', 'active', 'inactive', 'suspended'];
const GENDERS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
  { value: 'unknown', label: 'Chưa xác định' },
];
const EMPTY_EDIT_FORM = {
  email: '',
  phone: '',
  status: 'active',
  first_name: '',
  last_name: '',
  display_name: '',
  gender: 'unknown',
  date_of_birth: '',
  marketing_opt_in: false,
};

export default function Users() {
  const { user, can } = useAuth();
  const writable = can('users.write');
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, limit: 30, total: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('customer');
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [sel, setSel] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [sf, setSf] = useState({ role_code: 'store_manager' });
  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState(null);
  const [userForceDeleteTarget, setUserForceDeleteTarget] = useState(null);
  const [pwTarget, setPwTarget] = useState(null);
  const [pwForm, setPwForm] = useState({ password: '', confirm: '', must_change_password: true });
  const [pwSaving, setPwSaving] = useState(false);

  const load = async (page = 1, quiet = false) => {
    try {
      const { data } = await api.get('/users', { params: { page, limit: 30, search } });
      setRows(data.data);
      setPg({ page, limit: 30, total: data.pagination.total });
    } catch (e) {
      if (!quiet) toast.error(errMsg(e));
    }
  };

  useEffect(() => {
    load(1);
    api.get('/users/meta/roles').then((response) => setRoles(response.data)).catch(() => {});
    api.get('/users/meta/permissions').then((response) => setPerms(response.data)).catch(() => {});
  }, []);

  const shown = rows.filter((row) => (tab === 'staff' ? isStaff(row.roles) : !isStaff(row.roles)));
  const selectedUser = sel?.user || sel;
  const selectedRoles = sel?.roles || [];

  const open = async (id) => {
    try {
      const { data } = await api.get(`/users/${id}`);
      setSel(data);
      return data;
    } catch (e) {
      toast.error(errMsg(e));
      return null;
    }
  };

  const startEdit = async (id) => {
    if (editLoadingId !== null) return;
    setEditLoadingId(id);
    try {
      const { data } = await api.get(`/users/${id}`);
      const detail = data.user || data;
      const profile = data.profile || {};
      setEditUserId(detail.id);
      setEditForm({
        email: detail.email || '',
        phone: detail.phone || '',
        status: detail.status || 'active',
        first_name: profile.first_name ?? detail.first_name ?? '',
        last_name: profile.last_name ?? detail.last_name ?? '',
        display_name: profile.display_name ?? detail.display_name ?? '',
        gender: profile.gender || detail.gender || 'unknown',
        date_of_birth: toDateInput(profile.date_of_birth || detail.date_of_birth),
        marketing_opt_in: Boolean(profile.marketing_opt_in ?? detail.marketing_opt_in),
      });
      setEditOpen(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setEditLoadingId(null);
    }
  };

  const closeEditDialog = (openState) => {
    if (editSaving) return;
    setEditOpen(openState);
    if (!openState) setEditUserId(null);
  };

  const setEditField = (key, value) => setEditForm((current) => ({ ...current, [key]: value }));

  const saveUser = async () => {
    if (!editUserId) return;
    setEditSaving(true);
    const body = {
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      status: editForm.status,
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      display_name: editForm.display_name.trim(),
      gender: editForm.gender,
      date_of_birth: editForm.date_of_birth,
      marketing_opt_in: editForm.marketing_opt_in,
    };
    try {
      await api.put(`/users/${editUserId}`, body);
      toast.success('Đã cập nhật người dùng');
      const updatedId = editUserId;
      setEditOpen(false);
      setEditUserId(null);
      await load(pg.page, true);
      if (sel && String(selectedUser?.id) === String(updatedId)) await open(updatedId);
    } catch (e) {
      if (e.response?.status === 400 && String(user?.id) === String(editUserId) && editForm.status !== 'active') {
        toast.warning('Bạn không thể tự thay đổi trạng thái tài khoản đang đăng nhập.');
      } else {
        toast.error(errMsg(e));
      }
    } finally {
      setEditSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/users/${id}/status`, { status });
      toast.success('Đã cập nhật trạng thái');
      await load(pg.page, true);
      setSel(null);
    } catch (e) {
      if (e.response?.status === 400 && String(user?.id) === String(id)) {
        toast.warning('Bạn không thể tự thay đổi trạng thái tài khoản đang đăng nhập.');
      } else {
        toast.error(errMsg(e));
      }
    }
  };

  const grantRole = async (id, roleCode) => {
    try {
      await api.post(`/users/${id}/roles`, { role_code: roleCode });
      toast.success('Đã gán vai trò');
      await open(id);
      await load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const removeRole = async (id, role) => {
    if (removingRoleId !== null) return;
    setRemovingRoleId(role.id);
    try {
      await api.delete(`/users/${id}/roles/${role.id}`);
      toast.success('Đã gỡ vai trò');
      await open(id);
      await load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRemovingRoleId(null);
    }
  };

  const addStaff = async () => {
    if (!sf.password || sf.password.length < 8) {
      toast.error('Mật khẩu tối thiểu 8 ký tự');
      return;
    }
    if (!sf.email && !sf.phone) {
      toast.error('Vui nhập email hoặc số điện thoại');
      return;
    }
    setStaffSaving(true);
    try {
      await api.post('/users', sf);
      toast.success('Đã thêm nhân sự');
      setStaffOpen(false);
      setSf({ role_code: 'store_manager' });
      await load(1, true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setStaffSaving(false);
    }
  };

  const startUserDelete = () => {
    if (!selectedUser) return;
    setUserDeleteTarget({
      id: selectedUser.id,
      label: selectedUser.email || selectedUser.phone || `#${selectedUser.id}`,
    });
  };

  const deleteUser = async () => {
    const target = userDeleteTarget;
    if (!target) return;
    try {
      await api.patch(`/users/${target.id}/status`, { status: 'deleted' });
      toast.success('Đã xóa mềm người dùng');
      setUserDeleteTarget(null);
      setSel(null);
      await load(pg.page, true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        toast.error(errMsg(e));
        toast.warning('Không thể xóa mềm tài khoản này. Xóa vĩnh viễn sẽ xóa dữ liệu liên quan và không thể hoàn tác.');
        setUserDeleteTarget(null);
        setUserForceDeleteTarget({ ...target, orderCount: Number(e.response.data.order_count) || 0 });
      } else {
        toast.error(errMsg(e));
      }
    }
  };

  const forceDeleteUser = async () => {
    const target = userForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/users/${target.id}?force=1`);
      toast.success('Đã xóa vĩnh viễn người dùng');
      setUserForceDeleteTarget(null);
      setSel(null);
      await load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const setS = (key, value) => setSf((current) => ({ ...current, [key]: value }));

  const openPasswordDialog = (row) => {
    if (String(row.id) === String(user?.id)) {
      return toast.warning('Bạn không thể tự đặt lại mật khẩu. Dùng mục Hồ sơ để đổi.');
    }
    setPwForm({ password: '', confirm: '', must_change_password: true });
    setPwTarget({ id: row.id, label: row.email || row.phone || `#${row.id}` });
  };

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digit = '23456789';
    const sym = '!@#$%&*';
    const all = upper + lower + digit + sym;
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    const chars = [upper[arr[0] % upper.length], lower[arr[1] % lower.length], digit[arr[2] % digit.length], sym[arr[3] % sym.length]];
    for (let i = 4; i < 14; i++) chars.push(all[arr[i] % all.length]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = arr[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const value = chars.join('');
    setPwForm((current) => ({ ...current, password: value, confirm: value }));
  };

  const submitPassword = async () => {
    if (!pwTarget) return;
    if (pwForm.password.length < 8) return toast.error('Mật khẩu tối thiểu 8 ký tự');
    if (pwForm.password !== pwForm.confirm) return toast.error('Xác nhận mật khẩu không khớp');
    setPwSaving(true);
    try {
      await api.post(`/users/${pwTarget.id}/reset-password`, {
        password: pwForm.password,
        must_change_password: pwForm.must_change_password,
      });
      toast.success(`Đã đặt lại mật khẩu cho ${pwTarget.label}. Phiên đăng nhập cũ đã bị thu hồi.`);
      setPwTarget(null);
      if (sel && String(selectedUser?.id) === String(pwTarget.id)) await open(pwTarget.id);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Người dùng & Phân quyền"
        actions={writable && tab === 'staff' && <Button onClick={() => setStaffOpen(true)}><Plus />Thêm nhân sự</Button>}
      />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'customer', label: 'Khách hàng' },
          { key: 'staff', label: 'Nhân sự' },
          { key: 'roles', label: 'Vai trò & Quyền' },
        ]} />
        {tab !== 'roles' && (<>
          <Toolbar>
            <Input
              placeholder="Email / SĐT..."
              value={search}
              className="max-w-[260px]"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
            />
            <Button onClick={() => load(1)}>Tìm</Button>
          </Toolbar>
          <TableWrap>
            <table className="w-full text-sm">
              <THead><Tr><Th>ID</Th><Th>Email</Th><Th>SĐT</Th><Th>Vai trò</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></Tr></THead>
              <tbody>{shown.map((row) => (
                <Tr key={row.id}>
                  <Td>{row.id}</Td>
                  <Td>{row.email || '—'}</Td>
                  <Td>{row.phone || '—'}</Td>
                  <Td><div className="flex flex-wrap gap-1">{(row.roles || '').split(',').filter(Boolean).map((role) => <Badge key={role} color="blue">{roleVI(role)}</Badge>)}</div></Td>
                  <Td><StatusBadge group="user" value={row.status} /></Td>
                  <Td><RowActions>
                    <Button size="sm" variant="outline" onClick={() => open(row.id)}>Chi tiết</Button>
                    {writable && (
                      <>
                        <IconButton label="Đặt lại mật khẩu" onClick={() => openPasswordDialog(row)}>
                          <KeyRound />
                        </IconButton>
                        <IconButton label="Sửa người dùng" onClick={() => startEdit(row.id)} disabled={editLoadingId !== null}>
                          <Pencil />
                        </IconButton>
                      </>
                    )}
                  </RowActions></Td>
                </Tr>
              ))}</tbody>
            </table>
          </TableWrap>
          {!shown.length && <Empty />}
          <Pagination page={pg.page} limit={pg.limit} total={pg.total} onChange={(page) => load(page)} />
          {sel && selectedUser && (
            <div className="mt-3 rounded-lg border p-3 text-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="font-semibold">#{selectedUser.id} {selectedUser.email || selectedUser.phone}</div>
                {writable && (
                  <RowActions>
                    <IconButton label="Đặt lại mật khẩu" onClick={() => openPasswordDialog(selectedUser)}>
                      <KeyRound />
                    </IconButton>
                    <IconButton label="Xóa người dùng" onClick={startUserDelete}><Trash2 className="text-red-600" /></IconButton>
                  </RowActions>
                )}
              </div>
              <div className="mb-3">
                <span className="mb-1 block text-slate-500">Vai trò:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedRoles.length ? selectedRoles.map((role) => (
                    <Badge key={role.id} color="blue" className="inline-flex items-center gap-1">
                      <span>{roleVI(role.code)}</span>
                      {writable && (
                        <IconButton
                          label={`Gỡ vai trò ${roleVI(role.code)}`}
                          onClick={() => removeRole(selectedUser.id, role)}
                          disabled={removingRoleId !== null}
                        >
                          <X />
                        </IconButton>
                      )}
                    </Badge>
                  )) : <span className="text-slate-400">Chưa có vai trò</span>}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Trạng thái:</span>
                  <StatusBadge group="user" value={selectedUser.status} />
                </div>
                {writable && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <select
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      defaultValue=""
                      onChange={(e) => e.target.value && setStatus(selectedUser.id, e.target.value)}
                    >
                      <option value="">Đổi trạng thái...</option>
                      {opts('user', USER_STATUSES).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      defaultValue=""
                      onChange={(e) => e.target.value && grantRole(selectedUser.id, e.target.value)}
                    >
                      <option value="">Gán vai trò...</option>
                      {roles.map((role) => <option key={role.code} value={role.code}>{roleVI(role.code)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </>)}
        {tab === 'roles' && (<>
          <h4 className="mb-2 text-sm font-semibold">Vai trò ({roles.length})</h4>
          <div className="mb-3 flex flex-wrap gap-1.5">{roles.map((role) => <Badge key={role.id} color="blue" title={role.code}>{roleVI(role.code)}</Badge>)}</div>
          <h4 className="mb-2 text-sm font-semibold">Quyền ({perms.length})</h4>
          <div className="flex flex-wrap gap-1.5">{perms.map((permission) => <Badge key={permission.id} title={permission.code}>{permission.name === 'Xem audit log' ? 'Xem nhật ký' : (permission.name || permission.code)}</Badge>)}</div>
        </>)}
      </CardContent></Card>

      <Dialog open={editOpen} onOpenChange={closeEditDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Sửa người dùng</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email"><Input type="email" value={editForm.email} onChange={(e) => setEditField('email', e.target.value)} /></Field>
            <Field label="Số điện thoại"><Input type="tel" value={editForm.phone} onChange={(e) => setEditField('phone', e.target.value)} /></Field>
            <Field label="Trạng thái *">
              <Select value={editForm.status} onChange={(e) => setEditField('status', e.target.value)}>
                {opts('user', USER_STATUSES).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="Giới tính">
              <Select value={editForm.gender} onChange={(e) => setEditField('gender', e.target.value)}>
                {GENDERS.map((gender) => <option key={gender.value} value={gender.value}>{gender.label}</option>)}
              </Select>
            </Field>
            <Field label="Tên"><Input value={editForm.first_name} onChange={(e) => setEditField('first_name', e.target.value)} /></Field>
            <Field label="Họ"><Input value={editForm.last_name} onChange={(e) => setEditField('last_name', e.target.value)} /></Field>
            <Field label="Tên hiển thị" className="sm:col-span-2"><Input value={editForm.display_name} onChange={(e) => setEditField('display_name', e.target.value)} /></Field>
            <Field label="Ngày sinh"><Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditField('date_of_birth', e.target.value)} /></Field>
            <Field label="Thiết bị quảng cáo" className="sm:col-span-2">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={editForm.marketing_opt_in} onChange={(e) => setEditField('marketing_opt_in', e.target.checked)} />
                Đồng ý nhận thông tin tiếp thị
              </label>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={editSaving} onClick={() => closeEditDialog(false)}>Hủy</Button>
            <Button disabled={editSaving} onClick={saveUser}>{editSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={staffOpen} onOpenChange={(openState) => !staffSaving && setStaffOpen(openState)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Thêm nhân sự</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email"><Input value={sf.email || ''} onChange={(e) => setS('email', e.target.value)} /></Field>
            <Field label="Số điện thoại"><Input value={sf.phone || ''} onChange={(e) => setS('phone', e.target.value)} /></Field>
            <Field label="Mật khẩu *"><Input type="password" value={sf.password || ''} onChange={(e) => setS('password', e.target.value)} /></Field>
            <Field label="Vai trò *">
              <Select value={sf.role_code} onChange={(e) => setS('role_code', e.target.value)}>
                {roles.filter((role) => role.code !== 'customer').map((role) => <option key={role.code} value={role.code}>{roleVI(role.code)}</option>)}
              </Select>
            </Field>
            <Field label="Tên"><Input value={sf.first_name || ''} onChange={(e) => setS('first_name', e.target.value)} /></Field>
            <Field label="Họ"><Input value={sf.last_name || ''} onChange={(e) => setS('last_name', e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={staffSaving} onClick={() => setStaffOpen(false)}>Hủy</Button>
            <Button disabled={staffSaving} onClick={addStaff}>{staffSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwTarget} onOpenChange={(openState) => !pwSaving && !openState && setPwTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Đặt lại mật khẩu</DialogTitle></DialogHeader>
          <p className="-mt-1 text-sm text-slate-600">
            Đặt mật khẩu mới cho <span className="font-medium text-slate-900">{pwTarget?.label}</span>.
            Toàn bộ phiên đăng nhập đang mở của tài khoản này sẽ bị thu hồi ngay.
          </p>
          <div className="grid gap-3">
            <Field label="Mật khẩu mới *" hint="Tối thiểu 8 ký tự">
              <div className="flex gap-2">
                <Input
                  type="text"
                  className="font-mono"
                  value={pwForm.password}
                  onChange={(e) => setPwForm((c) => ({ ...c, password: e.target.value }))}
                  placeholder="Nhập hoặc sinh tự động"
                />
                <Button type="button" variant="outline" onClick={generatePassword} className="shrink-0">
                  Sinh
                </Button>
              </div>
            </Field>
            <Field label="Xác nhận mật khẩu *">
              <Input
                type="text"
                className="font-mono"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((c) => ({ ...c, confirm: e.target.value }))}
              />
            </Field>
            <Field label="Ảnh xem trước">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {pwForm.password
                  ? <span className="break-all font-mono text-slate-800">{pwForm.password}</span>
                  : <span className="text-slate-400">Chưa có mật khẩu</span>}
                <div className="mt-1 text-slate-500">Cần gửi kênh bảo mật cho người dùng. Nên tạo mật khẩu ngẫu nhiên thay vì tự đặt.</div>
              </div>
            </Field>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={pwForm.must_change_password}
                onChange={(e) => setPwForm((c) => ({ ...c, must_change_password: e.target.checked }))}
              />
              <span>Bắt buộc đổi mật khẩu khi đăng nhập lần tới</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pwSaving} onClick={() => setPwTarget(null)}>Hủy</Button>
            <Button disabled={pwSaving || !pwForm.password} onClick={submitPassword}>
              {pwSaving ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!userDeleteTarget}
        onOpenChange={(openState) => !openState && setUserDeleteTarget(null)}
        title="Xóa người dùng?"
        description={`Tài khoản “${userDeleteTarget?.label || ''}” sẽ được đánh dấu là đã xóa và không thể đăng nhập.`}
        onConfirm={deleteUser}
      />
      <ConfirmDialog
        open={!!userForceDeleteTarget}
        onOpenChange={(openState) => !openState && setUserForceDeleteTarget(null)}
        title="Xóa vĩnh viễn người dùng?"
        description={`Tài khoản “${userForceDeleteTarget?.label || ''}” và dữ liệu liên quan sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`}
        confirmText="Xóa vĩnh viễn"
        onConfirm={forceDeleteUser}
      />
    </div>
  );
}
