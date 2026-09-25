import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field, Select, Textarea } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs, ConfirmDialog, IconButton, RowActions, StatusBadge } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';
const SHIP_FLOW = ['pending', 'ready', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'];
const isActive = (value) => Number(value) === 1;
const methodPayload = (value = {}) => ({
  provider_id: value.provider_id ? Number(value.provider_id) : null,
  code: value.code || '',
  name: value.name || '',
  description: value.description || null,
  base_fee: Number(value.base_fee) || 0,
  is_active: isActive(value.is_active),
  sort_order: Number(value.sort_order) || 0,
});

export default function Shipping() {
  const { can } = useAuth();
  const writable = can('shipping.write');
  const [tab, setTab] = useState('s');
  const [methods, setMethods] = useState([]);
  const [providers, setProviders] = useState([]);
  const [ships, setShips] = useState([]);
  const [sel, setSel] = useState(null);
  const [track, setTrack] = useState([]);
  const [mOpen, setMOpen] = useState(false);
  const [mEditing, setMEditing] = useState(null);
  const [mForm, setMForm] = useState({});
  const [mSaving, setMSaving] = useState(false);
  const [mToggleId, setMToggleId] = useState(null);
  const [mDeleteTarget, setMDeleteTarget] = useState(null);
  const [mForceDeleteTarget, setMForceDeleteTarget] = useState(null);

  const load = (quiet = false) => {
    api.get('/shipping/methods?all=1').then((r) => setMethods(r.data)).catch(() => {});
    api.get('/shipping/providers').then((r) => setProviders(r.data)).catch(() => {});
    api.get('/shipping/shipments').then((r) => setShips(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const open = async (id, quiet = false) => {
    try {
      const { data } = await api.get(`/shipping/shipments/${id}`);
      setSel(data);
      setTrack(data.tracking || []);
    } catch (e) {
      if (!quiet) toast.error(errMsg(e));
    }
  };
  const startMethodCreate = () => {
    setMEditing(null);
    setMForm({ provider_id: '', base_fee: 0, sort_order: 0, is_active: true });
    setMOpen(true);
  };
  const startMethodEdit = (row) => {
    setMEditing(row);
    setMForm({
      provider_id: row.provider_id || '',
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
      base_fee: Number(row.base_fee) || 0,
      is_active: isActive(row.is_active),
      sort_order: Number(row.sort_order) || 0,
    });
    setMOpen(true);
  };
  const closeMethodDialog = () => {
    if (mSaving) return;
    setMOpen(false);
    setMEditing(null);
    setMForm({});
  };
  const handleMethodOpenChange = (open) => {
    if (open) setMOpen(true);
    else closeMethodDialog();
  };
  const saveMethod = async () => {
    if (!mForm.code?.trim() || !mForm.name?.trim()) return toast.error('Nhập mã và tên');
    setMSaving(true);
    try {
      const payload = methodPayload(mForm);
      if (mEditing?.id) await api.put(`/shipping/methods/${mEditing.id}`, payload);
      else await api.post('/shipping/methods', payload);
      toast.success(mEditing?.id ? 'Đã cập nhật hình thức giao hàng' : 'Đã thêm hình thức giao hàng');
      setMOpen(false);
      setMEditing(null);
      setMForm({});
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMSaving(false);
    }
  };
  const toggleMethod = async (row) => {
    if (mToggleId !== null) return;
    const nextActive = !isActive(row.is_active);
    setMToggleId(row.id);
    try {
      await api.patch(`/shipping/methods/${row.id}/toggle`);
      toast.success(nextActive ? 'Đã bật' : 'Đã tắt');
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMToggleId(null);
    }
  };
  const removeMethod = async () => {
    const target = mDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/shipping/methods/${target.id}`);
      toast.success('Đã xóa hình thức giao hàng');
      setMDeleteTarget(null);
      load(true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        toast.warning(errMsg(e));
        setMDeleteTarget(null);
        setMForceDeleteTarget({
          ...target,
          shipmentCount: Number(e.response.data.shipment_count) || 0,
          orderCount: Number(e.response.data.order_count) || 0,
        });
      } else {
        toast.error(errMsg(e));
      }
    }
  };
  const forceRemoveMethod = async () => {
    const target = mForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/shipping/methods/${target.id}?force=1`);
      toast.success('Đã xóa hình thức giao hàng');
      setMForceDeleteTarget(null);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const setStatus = async (status) => {
    try {
      await api.patch(`/shipping/shipments/${sel.id}/status`, { status });
      toast.success('Đã cập nhật');
      open(sel.id, true);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <PageHeader title="Vận chuyển" actions={writable && tab === 'm' && <Button onClick={startMethodCreate}><Plus />Thêm hình thức</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: 's', label: 'Vận đơn' }, { key: 'm', label: 'Hình thức giao hàng' }]} />
        {tab === 's' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>ID</Th><Th>Đơn</Th><Th>Mã vận đơn</Th><Th>Trạng thái</Th><Th>Phí giao hàng</Th><Th>COD</Th><Th /></Tr></THead>
            <tbody>{ships.map((r) => (
              <Tr key={r.id}>
                <Td>{r.id}</Td><Td>{r.order_id}</Td><Td>{r.tracking_number}</Td>
                <Td><StatusBadge group="ship" value={r.status} /></Td>
                <Td>{fmtVND(r.shipping_fee)}</Td><Td>{fmtVND(r.cod_amount)}</Td>
                <Td><Button size="sm" variant="outline" onClick={() => open(r.id)}><Eye />Theo dõi</Button></Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!ships.length && <Empty />}
        </>)}
        {tab === 'm' && (<>
          {writable && <div className="mb-3"><Button onClick={startMethodCreate}><Plus />Thêm hình thức</Button></div>}
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Tên</Th><Th>Nhà cung cấp</Th><Th>Phí</Th><Th>Số vận đơn dùng</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{methods.map((m) => <Tr key={m.id}>
              <Td>{m.code}</Td><Td>{m.name}</Td><Td>{m.provider_name || '—'}</Td><Td>{fmtVND(m.base_fee)}</Td>
              <Td>{m.shipment_count ?? 0}</Td>
              <Td><Badge color={isActive(m.is_active) ? 'green' : 'default'}>{isActive(m.is_active) ? 'Đang bật' : 'Đang tắt'}</Badge></Td>
              <Td><RowActions>{writable && (<>
                <IconButton label={isActive(m.is_active) ? 'Tắt hình thức' : 'Bật hình thức'} onClick={() => toggleMethod(m)} disabled={mToggleId === m.id}>
                  {isActive(m.is_active) ? <EyeOff /> : <Eye />}
                </IconButton>
                <IconButton label="Sửa hình thức" onClick={() => startMethodEdit(m)}><Pencil /></IconButton>
                <IconButton label="Xóa hình thức" onClick={() => setMDeleteTarget(m)}><Trash2 className="text-red-600" /></IconButton>
              </>)}</RowActions></Td>
            </Tr>)}</tbody>
          </table></TableWrap>
          {!methods.length && <Empty />}
        </>)}
      </CardContent></Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vận đơn #{sel?.id} (đơn {sel?.order_id})</DialogTitle></DialogHeader>
          {sel && (<>
            {writable && (
              <select className={inputCls} style={{ maxWidth: 260 }} value="" onChange={(e) => e.target.value && setStatus(e.target.value)}>
                <option value="">Chuyển trạng thái...</option>
                {opts('ship', SHIP_FLOW).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <ol className="mt-2 grid gap-2">
              {track.map((tr) => (
                <li key={tr.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium">{t('ship', tr.status)}</span>
                  {tr.description && tr.description !== tr.status && <span className="text-slate-500"> — {tr.description}</span>}
                  {tr.location && <span className="text-slate-500"> ({tr.location})</span>}
                  <div className="text-xs text-slate-400">{fmtDate(tr.occurred_at)}</div>
                </li>
              ))}
              {!track.length && <Empty text="Chưa có hành trình" />}
            </ol>
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={mOpen} onOpenChange={handleMethodOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mEditing?.id ? 'Sửa hình thức giao hàng' : 'Thêm hình thức giao hàng'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nhà cung cấp">
              <Select value={mForm.provider_id || ''} onChange={(e) => setMForm({ ...mForm, provider_id: e.target.value ? Number(e.target.value) : null })} disabled={mSaving}>
                <option value="">Không chọn</option>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </Select>
            </Field>
            <Field label="Mã *"><Input value={mForm.code || ''} onChange={(e) => setMForm({ ...mForm, code: e.target.value })} disabled={mSaving} /></Field>
            <Field label="Tên *"><Input value={mForm.name || ''} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} disabled={mSaving} /></Field>
            <Field label="Phí (VND)"><Input type="number" min={0} value={mForm.base_fee ?? ''} onChange={(e) => setMForm({ ...mForm, base_fee: e.target.value === '' ? '' : Number(e.target.value) })} disabled={mSaving} /></Field>
            <Field label="Mô tả" className="sm:col-span-2"><Textarea value={mForm.description || ''} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} disabled={mSaving} /></Field>
            <Field label="Thứ tự"><Input type="number" min={0} value={mForm.sort_order ?? ''} onChange={(e) => setMForm({ ...mForm, sort_order: e.target.value === '' ? '' : Number(e.target.value) })} disabled={mSaving} /></Field>
            <Field label="Trạng thái">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={mForm.is_active ?? true} onChange={(e) => setMForm({ ...mForm, is_active: e.target.checked })} disabled={mSaving} />
                Đang bật
              </label>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={mSaving} onClick={closeMethodDialog}>Hủy</Button>
            <Button disabled={mSaving} onClick={saveMethod}>{mSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!mDeleteTarget}
        onOpenChange={(open) => !open && setMDeleteTarget(null)}
        title="Xóa hình thức giao hàng"
        description={`Hình thức “${mDeleteTarget?.name || ''}” sẽ bị xóa khỏi danh sách.`}
        onConfirm={removeMethod}
      />
      <ConfirmDialog
        open={!!mForceDeleteTarget}
        onOpenChange={(open) => !open && setMForceDeleteTarget(null)}
        title="Xóa hình thức đã sử dụng?"
        description={`Hình thức “${mForceDeleteTarget?.name || ''}” đã dùng cho ${mForceDeleteTarget?.shipmentCount || 0} vận đơn và ${mForceDeleteTarget?.orderCount || 0} đơn hàng. Xóa cưỡng chế sẽ gỡ các liên kết trước khi xóa.`}
        confirmText="Xóa cưỡng chế"
        onConfirm={forceRemoveMethod}
      />
    </div>
  );
}
