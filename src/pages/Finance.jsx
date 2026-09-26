import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Select, Field, Textarea } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs, ConfirmDialog } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { OrderPicker } from '../components/pickers';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Finance() {
  const { can } = useAuth();
  const writable = can('payments.write');
  const [tab, setTab] = useState('inv');
  const [invs, setInvs] = useState([]);
  const [flows, setFlows] = useState([]);
  const [invOpen, setInvOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [invOrder, setInvOrder] = useState(null);
  const [inv, setInv] = useState({});
  const [fl, setFl] = useState({ type: 'expense' });
  const [invSaving, setInvSaving] = useState(false);
  const [flSaving, setFlSaving] = useState(false);
  const [invStatusTarget, setInvStatusTarget] = useState(null);
  const [invStatusBusy, setInvStatusBusy] = useState(false);

  const load = (quiet = false) => {
    api.get('/invoices').then((r) => setInvs(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/cash-flows').then((r) => setFlows(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const setI = (k, v) => setInv((x) => ({ ...x, [k]: v }));

  const openInv = () => { setInv({}); setInvOrder(null); setInvOpen(true); };
  const closeInv = (next) => {
    if (invSaving) return;
    setInvOpen(next);
    if (!next) { setInv({}); setInvOrder(null); }
  };

  const createInv = async () => {
    if (!invOrder) return toast.warning('Chọn đơn hàng');
    if (!String(inv.buyer_name || '').trim() && !String(inv.buyer_company_name || '').trim()) {
      return toast.error('Cần nhập tên người mua hoặc tên công ty');
    }
    if (inv.buyer_email && !EMAIL_RE.test(String(inv.buyer_email).trim())) {
      return toast.error('Email người mua không hợp lệ');
    }
    setInvSaving(true);
    const payload = {
      order_id: invOrder,
      buyer_name: String(inv.buyer_name || '').trim() || null,
      buyer_company_name: String(inv.buyer_company_name || '').trim() || null,
      buyer_tax_code: String(inv.buyer_tax_code || '').trim() || null,
      buyer_address: String(inv.buyer_address || '').trim() || null,
      buyer_email: String(inv.buyer_email || '').trim() || null,
    };
    try {
      await api.post('/invoices', payload);
      toast.success('Đã tạo hóa đơn');
      closeInv(false);
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setInvSaving(false); }
  };

  const invStatus = async () => {
    const target = invStatusTarget;
    if (!target) return;
    setInvStatusBusy(true);
    try {
      await api.patch(`/invoices/${target.id}/status`, { status: target.status });
      toast.success('Đã cập nhật trạng thái hóa đơn');
      setInvStatusTarget(null);
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setInvStatusBusy(false); }
  };

  const openFlow = () => { setFl({ type: 'expense' }); setFlowOpen(true); };
  const closeFlow = (next) => {
    if (flSaving) return;
    setFlowOpen(next);
    if (!next) setFl({ type: 'expense' });
  };

  const createFlow = async () => {
    const amount = Number(fl.amount);
    if (fl.amount === undefined || fl.amount === '' || !Number.isFinite(amount)) return toast.error('Nhập số tiền');
    if (amount <= 0) return toast.error('Số tiền phải lớn hơn 0');
    if (fl.description && !String(fl.description).trim()) return toast.error('Diễn giải không được để trống');
    setFlSaving(true);
    try {
      await api.post('/cash-flows', { ...fl, amount, description: String(fl.description || '').trim() || null });
      toast.success('Đã ghi dòng tiền');
      closeFlow(false);
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setFlSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Hóa đơn & Dòng tiền" actions={writable && (
        tab === 'inv'
          ? <Button onClick={openInv}><Plus />Xuất hóa đơn</Button>
          : <Button onClick={openFlow}><Plus />Ghi thu/chi</Button>
      )} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: 'inv', label: 'Hóa đơn' }, { key: 'flow', label: 'Dòng tiền' }]} />
        {tab === 'inv' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số HĐ</Th><Th>Đơn</Th><Th>Khách</Th><Th>Tổng</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{invs.map((r) => (
              <Tr key={r.id}>
                <Td>{r.invoice_number}</Td><Td>{r.order_id}</Td><Td>{r.buyer_name || r.buyer_company_name || '—'}</Td><Td>{fmtVND(r.total_amount)}</Td>
                <Td><Badge color={r.status === 'issued' ? 'green' : 'default'}>{t('invoice', r.status)}</Badge></Td>
                <Td className="text-right">{writable && (
                  <Select className="ml-auto h-8 w-auto text-xs" value={r.status}
                    onChange={(e) => setInvStatusTarget({ id: r.id, status: e.target.value, number: r.invoice_number })}>
                    {opts('invoice', ['draft', 'issued', 'cancelled']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                )}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!invs.length && <Empty />}
        </>)}
        {tab === 'flow' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Loại</Th><Th>Tham chiếu</Th><Th>Số tiền</Th><Th>Diễn giải</Th><Th>Ngày</Th></Tr></THead>
            <tbody>{flows.map((r) => (
              <Tr key={r.id}>
                <Td><Badge color={r.type === 'income' ? 'green' : 'red'}>{t('cash', r.type)}</Badge></Td>
                <Td>{r.reference_type}</Td><Td>{fmtVND(r.amount)}</Td><Td>{r.description}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.occurred_at)}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!flows.length && <Empty />}
        </>)}
      </CardContent></Card>

      <Dialog open={invOpen} onOpenChange={closeInv}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Xuất hóa đơn từ đơn hàng</DialogTitle></DialogHeader>
          <Field label="Đơn hàng *"><OrderPicker value={invOrder} onChange={setInvOrder} disabled={invSaving} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Người mua" hint="Bắt buộc nhập tên người mua hoặc tên công ty">
              <Input value={inv.buyer_name || ''} onChange={(e) => setI('buyer_name', e.target.value)} disabled={invSaving} />
            </Field>
            <Field label="Công ty">
              <Input value={inv.buyer_company_name || ''} onChange={(e) => setI('buyer_company_name', e.target.value)} disabled={invSaving} />
            </Field>
            <Field label="Mã số thuế" hint="10 hoặc 13 chữ số">
              <Input value={inv.buyer_tax_code || ''} onChange={(e) => setI('buyer_tax_code', e.target.value)} disabled={invSaving} />
            </Field>
            <Field label="Email">
              <Input type="email" value={inv.buyer_email || ''} onChange={(e) => setI('buyer_email', e.target.value)} disabled={invSaving} />
            </Field>
            <Field label="Địa chỉ" className="sm:col-span-2">
              <Textarea rows={2} value={inv.buyer_address || ''} onChange={(e) => setI('buyer_address', e.target.value)} disabled={invSaving} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={invSaving} onClick={() => closeInv(false)}>Hủy</Button>
            <Button disabled={invSaving} onClick={createInv}>{invSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={flowOpen} onOpenChange={closeFlow}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Ghi thu/chi</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loại">
              <Select value={fl.type} onChange={(e) => setFl((x) => ({ ...x, type: e.target.value }))} disabled={flSaving}>
                {opts('cash', ['income', 'expense', 'refund', 'shipping_cost', 'purchase', 'adjustment']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Số tiền *" hint="Số dương, không âm">
              <Input type="number" min={1} step={1000} value={fl.amount ?? ''} onChange={(e) => setFl((x) => ({ ...x, amount: e.target.value }))} disabled={flSaving} />
            </Field>
            <Field label="Diễn giải" className="sm:col-span-2">
              <Textarea rows={2} value={fl.description || ''} onChange={(e) => setFl((x) => ({ ...x, description: e.target.value }))} disabled={flSaving} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={flSaving} onClick={() => closeFlow(false)}>Hủy</Button>
            <Button disabled={flSaving} onClick={createFlow}>{flSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!invStatusTarget}
        onOpenChange={(next) => !next && setInvStatusTarget(null)}
        title="Đổi trạng thái hóa đơn?"
        description={`Hóa đơn ${invStatusTarget?.number || ''} sẽ chuyển sang “${opts('invoice', ['draft', 'issued', 'cancelled']).find((o) => o.value === invStatusTarget?.status)?.label || ''}”. Thao tác này ghi vào sổ kế toán và không thể hoàn tác.`}
        confirmText="Xác nhận"
        tone={invStatusTarget?.status === 'cancelled' ? 'danger' : 'default'}
        busy={invStatusBusy}
        onConfirm={invStatus}
      />
    </div>
  );
}
