import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field, Select } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader, Toolbar } from '../components/ui/table';
import { Tabs, ConfirmDialog, IconButton, RowActions, StatusBadge, TableSearch, useRowFilter } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { OrderPicker } from '../components/pickers';

const PAYMENT_TYPES = ['cod', 'bank_transfer', 'gateway', 'card', 'wallet', 'other'];
const isActive = (value) => Number(value) === 1;
const methodPayload = (value = {}) => ({
  code: value.code || '',
  name: value.name || '',
  provider: value.provider || null,
  type: value.type || 'other',
  is_active: isActive(value.is_active),
  sort_order: Number(value.sort_order) || 0,
  config: value.config ?? null,
});

export default function Payments() {
  const { can } = useAuth();
  const writable = can('payments.write');
  const [tab, setTab] = useState('pay');
  const [q, setQ] = useState('');
  const [pays, setPays] = useState([]);
  const [refs, setRefs] = useState([]);
  const [methods, setMethods] = useState([]);
  const [sel, setSel] = useState(null);
  const [refOpen, setRefOpen] = useState(false);
  const [refOrder, setRefOrder] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundSaving, setRefundSaving] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodEditing, setMethodEditing] = useState(null);
  const [methodForm, setMethodForm] = useState({});
  const [methodSaving, setMethodSaving] = useState(false);
  const [methodToggleId, setMethodToggleId] = useState(null);
  const [methodDeleteTarget, setMethodDeleteTarget] = useState(null);
  const [methodForceDeleteTarget, setMethodForceDeleteTarget] = useState(null);

  const load = (quiet = false) => {
    api.get('/payments').then((r) => setPays(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/payments/refunds/list').then((r) => setRefs(r.data)).catch(() => {});
    api.get('/payments/methods').then((r) => setMethods(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const open = async (id) => {
    try {
      const { data } = await api.get(`/payments/${id}`);
      setSel(data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const markPaid = async (id) => {
    try {
      await api.post(`/payments/${id}/mark-paid`);
      toast.success('Đã gạch đã thu');
      load(true);
      setSel(null);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const openRefund = () => { setAmount(''); setReason(''); setRefOrder(null); setRefOpen(true); };
  const closeRefund = (next) => {
    if (refundSaving) return;
    setRefOpen(next);
    if (!next) { setAmount(''); setReason(''); setRefOrder(null); }
  };
  const createRefund = async () => {
    if (!refOrder) return toast.warning('Chọn đơn hàng');
    const n = Number(amount);
    if (amount === '' || !Number.isFinite(n)) return toast.error('Nhập số tiền');
    if (n <= 0) return toast.error('Số tiền hoàn phải lớn hơn 0');
    if (!String(reason).trim()) return toast.error('Vui nhập lý do hoàn tiền');
    setRefundSaving(true);
    try {
      await api.post('/payments/refunds', { order_id: refOrder, amount: n, reason: String(reason).trim() });
      toast.success('Đã tạo yêu cầu hoàn tiền');
      closeRefund(false);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRefundSaving(false);
    }
  };
  const refundStatus = async (id, status) => {
    try {
      await api.patch(`/payments/refunds/${id}/status`, { status });
      toast.success('Đã cập nhật');
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const startMethodCreate = () => {
    setMethodEditing(null);
    setMethodForm({ type: 'cod', is_active: true, sort_order: 0, config: null });
    setMethodOpen(true);
  };
  const startMethodEdit = (row) => {
    setMethodEditing(row);
    setMethodForm({
      code: row.code || '',
      name: row.name || '',
      provider: row.provider || '',
      type: row.type || 'other',
      is_active: isActive(row.is_active),
      sort_order: Number(row.sort_order) || 0,
      config: row.config ?? null,
    });
    setMethodOpen(true);
  };
  const closeMethodDialog = () => {
    if (methodSaving) return;
    setMethodOpen(false);
    setMethodEditing(null);
    setMethodForm({});
  };
  const handleMethodOpenChange = (open) => {
    if (open) setMethodOpen(true);
    else closeMethodDialog();
  };
  const saveMethod = async () => {
    if (!methodForm.code?.trim() || !methodForm.name?.trim() || !methodForm.type) return toast.error('Nhập mã, tên và loại phương thức');
    setMethodSaving(true);
    try {
      const payload = methodPayload(methodForm);
      if (methodEditing?.id) await api.put(`/payments/methods/${methodEditing.id}`, payload);
      else await api.post('/payments/methods', payload);
      toast.success(methodEditing?.id ? 'Đã cập nhật phương thức' : 'Đã thêm phương thức');
      setMethodOpen(false);
      setMethodEditing(null);
      setMethodForm({});
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMethodSaving(false);
    }
  };
  const toggleMethod = async (row) => {
    if (methodToggleId !== null) return;
    const nextActive = !isActive(row.is_active);
    setMethodToggleId(row.id);
    try {
      await api.patch(`/payments/methods/${row.id}/toggle`);
      toast.success(nextActive ? 'Đã bật' : 'Đã tắt');
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMethodToggleId(null);
    }
  };
  const removeMethod = async () => {
    const target = methodDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/payments/methods/${target.id}`);
      toast.success('Đã xóa phương thức');
      setMethodDeleteTarget(null);
      load(true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        toast.warning(errMsg(e));
        setMethodDeleteTarget(null);
        setMethodForceDeleteTarget({ ...target, paymentCount: Number(e.response.data.payment_count) || 0 });
      } else {
        toast.error(errMsg(e));
      }
    }
  };
  const forceRemoveMethod = async () => {
    const target = methodForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/payments/methods/${target.id}?force=1`);
      toast.success('Đã xóa phương thức');
      setMethodForceDeleteTarget(null);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const fPays = useRowFilter(pays, q, (r) => `${r.order_id || ''} ${r.method_code || ''} ${r.status || ''} ${r.gateway_txn_id || ''}`);
  const fRefs = useRowFilter(refs, q, (r) => `${r.refund_number || ''} ${r.order_id || ''} ${r.reason || ''} ${r.status || ''}`);
  const fMethods = useRowFilter(methods, q, (r) => `${r.code} ${r.name} ${r.provider || ''}`);

  return (
    <div>
      <PageHeader title="Thanh toán" actions={writable && tab === 'ref' && <Button onClick={openRefund}><Plus />Tạo hoàn tiền</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'pay', label: 'Thanh toán' }, { key: 'ref', label: 'Hoàn tiền' }, { key: 'm', label: 'Phương thức' },
        ]} />
        <Toolbar><TableSearch value={q} onChange={setQ} placeholder="Tìm trong bảng đang xem..." /></Toolbar>
        {tab === 'pay' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>ID</Th><Th>Đơn</Th><Th>Phương thức</Th><Th>Số tiền</Th><Th>Trạng thái</Th><Th>Đã thu</Th><Th /></Tr></THead>
            <tbody>{fPays.map((r) => (
              <Tr key={r.id}>
                <Td>{r.id}</Td><Td>{r.order_id}</Td><Td>{t('paymethod', r.method_code)}</Td><Td>{fmtVND(r.amount)}</Td>
                <Td><StatusBadge group="payment" value={r.status} /></Td>
                <Td className="whitespace-nowrap">{fmtDate(r.paid_at)}</Td>
                <Td><div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => open(r.id)}><Eye />Chi tiết</Button>
                  {writable && r.status !== 'paid' && <Button size="sm" onClick={() => markPaid(r.id)}>Gạch đã thu</Button>}
                </div></Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!pays.length && <Empty />}</>
        )}
        {tab === 'ref' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số</Th><Th>Đơn</Th><Th>Số tiền</Th><Th>Lý do</Th><Th>Trạng thái</Th><Th /></Tr></THead>
            <tbody>{fRefs.map((r) => (
              <Tr key={r.id}>
                <Td>{r.refund_number}</Td><Td>{r.order_id}</Td><Td>{fmtVND(r.amount)}</Td><Td>{r.reason}</Td>
                <Td><StatusBadge group="payment" value={t('refund', r.status)} /></Td>
                <Td>{writable && (
                  <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={r.status}
                    onChange={(e) => refundStatus(r.id, e.target.value)}>
                    {opts('refund', ['requested', 'approved', 'processing', 'completed', 'failed', 'cancelled']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!refs.length && <Empty />}</>
        )}
        {tab === 'm' && (<>
          {writable && <div className="mb-3"><Button onClick={startMethodCreate}><Plus />Thêm phương thức</Button></div>}
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Tên</Th><Th>Nhà cung cấp</Th><Th>Loại</Th><Th>Thứ tự</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{fMethods.map((m) => <Tr key={m.id}>
              <Td>{m.code}</Td><Td>{m.name}</Td><Td>{m.provider || '—'}</Td>
              <Td><Badge>{t('paymethod', m.type)}</Badge></Td>
              <Td>{m.sort_order ?? 0}</Td>
              <Td><Badge color={isActive(m.is_active) ? 'green' : 'default'}>{isActive(m.is_active) ? 'Đang bật' : 'Đang tắt'}</Badge></Td>
              <Td><RowActions>{writable && (<>
                <IconButton label={isActive(m.is_active) ? 'Tắt phương thức' : 'Bật phương thức'} onClick={() => toggleMethod(m)} disabled={methodToggleId === m.id}>
                  {isActive(m.is_active) ? <EyeOff /> : <Eye />}
                </IconButton>
                <IconButton label="Sửa phương thức" onClick={() => startMethodEdit(m)}><Pencil /></IconButton>
                <IconButton label="Xóa phương thức" onClick={() => setMethodDeleteTarget(m)}><Trash2 className="text-red-600" /></IconButton>
              </>)}</RowActions></Td>
            </Tr>)}</tbody>
          </table></TableWrap>
          {!methods.length && <Empty />}
        </>)}
      </CardContent></Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Thanh toán #{sel?.id}</DialogTitle></DialogHeader>
          {sel && (<>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between border-b border-slate-100 py-1.5"><dt className="text-slate-500">Đơn</dt><dd className="font-medium">{sel.order_id}</dd></div>
              <div className="flex justify-between border-b border-slate-100 py-1.5"><dt className="text-slate-500">Số tiền</dt><dd className="font-medium">{fmtVND(sel.amount)}</dd></div>
              <div className="flex justify-between border-b border-slate-100 py-1.5"><dt className="text-slate-500">Trạng thái</dt><dd><StatusBadge group="payment" value={sel.status} /></dd></div>
              <div className="flex justify-between border-b border-slate-100 py-1.5"><dt className="text-slate-500">Đã thu</dt><dd>{fmtDate(sel.paid_at)}</dd></div>
            </dl>
            <h4 className="mb-2 mt-3 text-sm font-semibold">Giao dịch ({sel.transactions.length})</h4>
            <TableWrap><table className="w-full text-sm">
              <THead><Tr><Th>Loại</Th><Th>Kết quả</Th><Th>Số tiền</Th><Th>Mã chống trùng</Th></Tr></THead>
              <tbody>{sel.transactions.map((x) => <Tr key={x.id}><Td>{t('paytype', x.transaction_type)}</Td>
                <Td><Badge>{t('txtype', x.status)}</Badge></Td><Td>{fmtVND(x.amount)}</Td><Td>{x.idempotency_key}</Td></Tr>)}</tbody>
            </table></TableWrap>
            {!sel.transactions.length && <Empty />}
          </>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSel(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refOpen} onOpenChange={closeRefund}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Tạo hoàn tiền</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Đơn hàng *" className="sm:col-span-2"><OrderPicker value={refOrder} onChange={setRefOrder} disabled={refundSaving} /></Field>
            <Field label="Số tiền *" hint="Số dương, không âm"><Input type="number" min={1} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={refundSaving} /></Field>
            <Field label="Lý do *"><Input value={reason} onChange={(e) => setReason(e.target.value)} disabled={refundSaving} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={refundSaving} onClick={() => closeRefund(false)}>Hủy</Button>
            <Button disabled={refundSaving} onClick={createRefund}>{refundSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={methodOpen} onOpenChange={handleMethodOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{methodEditing?.id ? 'Sửa phương thức' : 'Thêm phương thức'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã *"><Input value={methodForm.code || ''} onChange={(e) => setMethodForm({ ...methodForm, code: e.target.value })} disabled={methodSaving} /></Field>
            <Field label="Tên *"><Input value={methodForm.name || ''} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} disabled={methodSaving} /></Field>
            <Field label="Nhà cung cấp"><Input value={methodForm.provider || ''} onChange={(e) => setMethodForm({ ...methodForm, provider: e.target.value })} disabled={methodSaving} /></Field>
            <Field label="Loại *">
              <Select value={methodForm.type || 'other'} onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value })} disabled={methodSaving}>
                {PAYMENT_TYPES.map((type) => <option key={type} value={type}>{t('paymethod', type)}</option>)}
              </Select>
            </Field>
            <Field label="Thứ tự"><Input type="number" min={0} value={methodForm.sort_order ?? ''} onChange={(e) => setMethodForm({ ...methodForm, sort_order: e.target.value === '' ? '' : Number(e.target.value) })} disabled={methodSaving} /></Field>
            <Field label="Trạng thái">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={methodForm.is_active ?? true} onChange={(e) => setMethodForm({ ...methodForm, is_active: e.target.checked })} disabled={methodSaving} />
                Đang bật
              </label>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={methodSaving} onClick={closeMethodDialog}>Hủy</Button>
            <Button disabled={methodSaving} onClick={saveMethod}>{methodSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!methodDeleteTarget}
        onOpenChange={(open) => !open && setMethodDeleteTarget(null)}
        title="Xóa phương thức"
        description={`Phương thức “${methodDeleteTarget?.name || ''}” sẽ bị xóa khỏi danh sách.`}
        onConfirm={removeMethod}
      />
      <ConfirmDialog
        open={!!methodForceDeleteTarget}
        onOpenChange={(open) => !open && setMethodForceDeleteTarget(null)}
        title="Xóa phương thức đã sử dụng?"
        description={`Phương thức “${methodForceDeleteTarget?.name || ''}” đã được dùng cho ${methodForceDeleteTarget?.paymentCount || 0} thanh toán. Các thanh toán sẽ được gỡ liên kết trước khi xóa.`}
        confirmText="Xóa cưỡng chế"
        onConfirm={forceRemoveMethod}
      />
    </div>
  );
}
