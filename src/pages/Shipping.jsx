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

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';
const SHIP_FLOW = ['pending', 'ready', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'];

export default function Shipping() {
  const { can } = useAuth();
  const writable = can('shipping.write');
  const [tab, setTab] = useState('s');
  const [methods, setMethods] = useState([]);
  const [ships, setShips] = useState([]);
  const [sel, setSel] = useState(null);
  const [track, setTrack] = useState([]);
  const [mOpen, setMOpen] = useState(false);
  const [mForm, setMForm] = useState({});

  const load = (quiet = false) => {
    api.get('/shipping/methods').then((r) => setMethods(r.data)).catch(() => {});
    api.get('/shipping/shipments').then((r) => setShips(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const open = async (id, quiet = false) => {
    try { const { data } = await api.get(`/shipping/shipments/${id}`); setSel(data); setTrack(data.tracking || []); }
    catch (e) { if (!quiet) toast.error(errMsg(e)); }
  };
  const saveMethod = async () => {
    if (!mForm.code || !mForm.name) return toast.error('Nhập mã và tên');
    try { await api.post('/shipping/methods', mForm); toast.success('Đã thêm'); setMOpen(false); setMForm({}); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const setStatus = async (status) => {
    try { await api.patch(`/shipping/shipments/${sel.id}/status`, { status }); toast.success('Đã cập nhật'); open(sel.id, true); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Vận chuyển" actions={writable && tab === 'm' && <Button onClick={() => setMOpen(true)}><Plus />Thêm hình thức</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: 's', label: 'Vận đơn' }, { key: 'm', label: 'Hình thức giao hàng' }]} />
        {tab === 's' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>ID</Th><Th>Đơn</Th><Th>Mã vận đơn</Th><Th>Trạng thái</Th><Th>Phí ship</Th><Th>COD</Th><Th /></Tr></THead>
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
        {tab === 'm' && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Tên</Th><Th>Phí</Th><Th>Bật</Th></Tr></THead>
            <tbody>{methods.map((m) => <Tr key={m.id}><Td>{m.code}</Td><Td>{m.name}</Td><Td>{fmtVND(m.base_fee)}</Td>
              <Td><Badge color={m.is_active ? 'green' : 'default'}>{m.is_active ? 'Có' : 'Không'}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
        )}
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

      <Dialog open={mOpen} onOpenChange={setMOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm hình thức giao hàng</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã *"><Input value={mForm.code || ''} onChange={(e) => setMForm({ ...mForm, code: e.target.value })} /></Field>
            <Field label="Tên *"><Input value={mForm.name || ''} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} /></Field>
            <Field label="Phí (VND)" className="sm:col-span-2"><Input type="number" min={0} value={mForm.base_fee ?? ''} onChange={(e) => setMForm({ ...mForm, base_fee: Number(e.target.value) })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMOpen(false)}>Hủy</Button>
            <Button onClick={saveMethod}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
