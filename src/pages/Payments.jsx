import { useEffect, useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs, StatusBadge } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { OrderPicker } from '../components/pickers';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';

export default function Payments() {
  const { can } = useAuth();
  const writable = can('payments.write');
  const [tab, setTab] = useState('pay');
  const [pays, setPays] = useState([]);
  const [refs, setRefs] = useState([]);
  const [methods, setMethods] = useState([]);
  const [sel, setSel] = useState(null);
  const [refOpen, setRefOpen] = useState(false);
  const [refOrder, setRefOrder] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

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
    try { const { data } = await api.get(`/payments/${id}`); setSel(data); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const markPaid = async (id) => {
    try { await api.post(`/payments/${id}/mark-paid`); toast.success('Đã gạch đã thu'); load(true); setSel(null); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const createRefund = async () => {
    if (!refOrder) return toast.warning('Chọn đơn hàng');
    if (!amount) return toast.error('Nhập số tiền');
    try { await api.post('/payments/refunds', { order_id: refOrder, amount: Number(amount), reason }); toast.success('Đã tạo yêu cầu hoàn tiền'); setRefOpen(false); setAmount(''); setReason(''); setRefOrder(null); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const refundStatus = async (id, status) => {
    try { await api.patch(`/payments/refunds/${id}/status`, { status }); toast.success('Đã cập nhật'); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Thanh toán" actions={writable && tab === 'ref' && <Button onClick={() => setRefOpen(true)}><Plus />Tạo hoàn tiền</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'pay', label: 'Thanh toán' }, { key: 'ref', label: 'Hoàn tiền' }, { key: 'm', label: 'Phương thức' },
        ]} />
        {tab === 'pay' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>ID</Th><Th>Đơn</Th><Th>Phương thức</Th><Th>Số tiền</Th><Th>Trạng thái</Th><Th>Đã thu</Th><Th /></Tr></THead>
            <tbody>{pays.map((r) => (
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
            <tbody>{refs.map((r) => (
              <Tr key={r.id}>
                <Td>{r.refund_number}</Td><Td>{r.order_id}</Td><Td>{fmtVND(r.amount)}</Td><Td>{r.reason}</Td>
                <Td><StatusBadge group="refund" value={r.status} /></Td>
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
        {tab === 'm' && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Tên</Th><Th>Loại</Th><Th>Bật</Th></Tr></THead>
            <tbody>{methods.map((m) => <Tr key={m.id}><Td>{m.code}</Td><Td>{m.name}</Td>
              <Td><Badge>{t('paymethod', m.type)}</Badge></Td>
              <Td><Badge color={m.is_active ? 'green' : 'default'}>{m.is_active ? 'Có' : 'Không'}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
        )}
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
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={refOpen} onOpenChange={setRefOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo hoàn tiền</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Đơn hàng *" className="sm:col-span-2"><OrderPicker value={refOrder} onChange={setRefOrder} /></Field>
            <Field label="Số tiền *"><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Lý do"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefOpen(false)}>Hủy</Button>
            <Button onClick={createRefund}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
