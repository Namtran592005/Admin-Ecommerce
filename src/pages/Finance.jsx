import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { OrderPicker } from '../components/pickers';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';

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

  const load = (quiet = false) => {
    api.get('/invoices').then((r) => setInvs(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/cash-flows').then((r) => setFlows(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const setI = (k, v) => setInv((x) => ({ ...x, [k]: v }));

  const createInv = async () => {
    if (!invOrder) return toast.warning('Chọn đơn hàng');
    try { await api.post('/invoices', { ...inv, order_id: invOrder }); toast.success('Đã tạo hóa đơn'); setInvOpen(false); setInv({}); setInvOrder(null); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const invStatus = async (id, status) => {
    try { await api.patch(`/invoices/${id}/status`, { status }); toast.success('Đã cập nhật'); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const createFlow = async () => {
    if (fl.amount === undefined || fl.amount === '') return toast.error('Nhập số tiền');
    try { await api.post('/cash-flows', { ...fl, amount: Number(fl.amount) }); toast.success('Đã ghi'); setFlowOpen(false); setFl({ type: 'expense' }); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Hóa đơn & Dòng tiền" actions={writable && (
        tab === 'inv'
          ? <Button onClick={() => setInvOpen(true)}><Plus />Xuất hóa đơn</Button>
          : <Button onClick={() => setFlowOpen(true)}><Plus />Ghi thu/chi</Button>
      )} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: 'inv', label: 'Hóa đơn' }, { key: 'flow', label: 'Dòng tiền' }]} />
        {tab === 'inv' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số HĐ</Th><Th>Đơn</Th><Th>Khách</Th><Th>Tổng</Th><Th>Trạng thái</Th><Th /></Tr></THead>
            <tbody>{invs.map((r) => (
              <Tr key={r.id}>
                <Td>{r.invoice_number}</Td><Td>{r.order_id}</Td><Td>{r.buyer_name}</Td><Td>{fmtVND(r.total_amount)}</Td>
                <Td><Badge color={r.status === 'issued' ? 'green' : 'default'}>{t('invoice', r.status)}</Badge></Td>
                <Td>{writable && (
                  <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={r.status}
                    onChange={(e) => invStatus(r.id, e.target.value)}>
                    {opts('invoice', ['draft', 'issued', 'cancelled']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
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

      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Xuất hóa đơn từ đơn hàng</DialogTitle></DialogHeader>
          <Field label="Đơn hàng *"><OrderPicker value={invOrder} onChange={setInvOrder} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Người mua"><Input value={inv.buyer_name || ''} onChange={(e) => setI('buyer_name', e.target.value)} /></Field>
            <Field label="Công ty"><Input value={inv.buyer_company_name || ''} onChange={(e) => setI('buyer_company_name', e.target.value)} /></Field>
            <Field label="Mã số thuế"><Input value={inv.buyer_tax_code || ''} onChange={(e) => setI('buyer_tax_code', e.target.value)} /></Field>
            <Field label="Email"><Input value={inv.buyer_email || ''} onChange={(e) => setI('buyer_email', e.target.value)} /></Field>
            <Field label="Địa chỉ" className="sm:col-span-2"><Input value={inv.buyer_address || ''} onChange={(e) => setI('buyer_address', e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvOpen(false)}>Hủy</Button>
            <Button onClick={createInv}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={flowOpen} onOpenChange={setFlowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ghi thu/chi</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loại">
              <select className={inputCls} value={fl.type} onChange={(e) => setFl({ ...fl, type: e.target.value })}>
                {opts('cash', ['income', 'expense', 'refund', 'shipping_cost', 'purchase', 'adjustment']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Số tiền *"><Input type="number" value={fl.amount ?? ''} onChange={(e) => setFl({ ...fl, amount: e.target.value })} /></Field>
            <Field label="Diễn giải" className="sm:col-span-2"><Input value={fl.description || ''} onChange={(e) => setFl({ ...fl, description: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlowOpen(false)}>Hủy</Button>
            <Button onClick={createFlow}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
