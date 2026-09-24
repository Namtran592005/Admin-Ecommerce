import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Pagination, Empty, Toolbar, PageHeader } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['packed', 'cancelled'], packed: ['shipping', 'cancelled'], shipping: ['delivered', 'returned'], delivered: ['completed', 'returned'], completed: [], cancelled: [], returned: ['refunded'], refunded: [] };

const inputCls = 'flex h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

export default function Orders() {
  const { can } = useAuth();
  const writable = can('orders.write');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pg, setPg] = useState({ page: 1, limit: 15, total: 0 });
  const [f, setF] = useState({ status: '', payment_status: '', search: '' });
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('info');
  const [note, setNote] = useState('');
  const pgRef = useRef(pg);
  pgRef.current = pg;

  const load = async (page = 1, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { page, limit: pgRef.current.limit, ...f } });
      setRows(data.data); setPg({ page, limit: pgRef.current.limit, total: data.pagination.total });
    } catch (e) { if (!quiet) toast.error(errMsg(e)); } finally { if (!quiet) setLoading(false); }
  };
  useEffect(() => { load(1); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(pgRef.current.page, true); }, 30000);
    return () => clearInterval(id);
  }, []);

  const open = async (id, quiet = false) => {
    try { const { data } = await api.get(`/orders/${id}`); setSel(data); setTab('info'); }
    catch (e) { if (!quiet) toast.error(errMsg(e)); }
  };
  const changeStatus = async (status) => {
    try {
      await api.patch(`/orders/${sel.id}/status`, { status });
      toast.success('Đã chuyển: ' + t('order', status));
      open(sel.id, true); load(pg.page, true);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    try { await api.post(`/orders/${sel.id}/notes`, { note }); toast.success('Đã ghi chú'); setNote(''); open(sel.id, true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const subTabs = [
    { key: 'info', label: 'Thông tin' },
    { key: 'items', label: `Món hàng (${sel?.items.length || 0})` },
    { key: 'addr', label: 'Địa chỉ' },
    { key: 'hist', label: 'Lịch sử' },
    { key: 'notes', label: `Ghi chú (${sel?.notes.length || 0})` },
  ];

  return (
    <div>
      <PageHeader title="Đơn hàng" />
      <Card><CardContent className="pt-4">
        <Toolbar>
          <select className={inputCls} style={{ width: 170 }} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">Trạng thái</option>
            {opts('order', Object.keys(NEXT)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={inputCls} style={{ width: 170 }} value={f.payment_status} onChange={(e) => setF({ ...f, payment_status: e.target.value })}>
            <option value="">Thanh toán</option>
            {opts('pay', ['unpaid', 'pending', 'paid', 'failed', 'refunded']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Input placeholder="Mã đơn ORD..." value={f.search} className="max-w-[220px]"
            onChange={(e) => setF({ ...f, search: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
          <Button onClick={() => load(1)}>Lọc</Button>
        </Toolbar>
        <TableWrap><table className="w-full text-sm">
          <THead><Tr>
            <Th>Mã đơn</Th><Th>Trạng thái</Th><Th>Thanh toán</Th><Th>Tổng</Th><Th>Coupon</Th><Th>Ngày đặt</Th><Th />
          </Tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td><button className="font-medium text-brand-600 hover:underline" onClick={() => open(r.id)}>{r.order_number}</button></Td>
                <Td><Badge color={{ pending: 'default', confirmed: 'blue', processing: 'cyan', packed: 'geekblue', shipping: 'orange', delivered: 'green', completed: 'green', cancelled: 'red', returned: 'volcano', refunded: 'purple' }[r.status]}>{t('order', r.status)}</Badge></Td>
                <Td><Badge>{t('pay', r.payment_status)}</Badge></Td>
                <Td>{fmtVND(r.total_amount)}</Td>
                <Td>{r.coupon_code || '—'}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.placed_at)}</Td>
                <Td><Button size="sm" variant="outline" onClick={() => open(r.id)}><Eye />Chi tiết</Button></Td>
              </Tr>
            ))}
          </tbody>
        </table></TableWrap>
        {!rows.length && !loading && <Empty />}
        <Pagination page={pg.page} limit={pg.limit} total={pg.total} onChange={(p) => load(p)} />
      </CardContent></Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Đơn {sel?.order_number}</DialogTitle></DialogHeader>
          {sel && (<>
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
              {subTabs.map((tb) => (
                <button key={tb.key} onClick={() => setTab(tb.key)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === tb.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500'}`}>
                  {tb.label}
                </button>
              ))}
            </div>
            {tab === 'info' && (<>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[['Trạng thái', t('order', sel.status)], ['Thanh toán', t('pay', sel.payment_status)], ['Tạm tính', fmtVND(sel.subtotal)], ['Giảm giá', fmtVND(sel.order_discount_amount)], ['Phí ship', fmtVND(sel.shipping_fee)], ['Tổng', fmtVND(sel.total_amount)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-100 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
                <div className="sm:col-span-2"><dt className="text-slate-500">Ghi chú khách</dt><dd>{sel.customer_note || '—'}</dd></div>
              </dl>
              {writable && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(NEXT[sel.status] || []).map((s) => (
                    <Button key={s} size="sm" variant={s === 'cancelled' ? 'destructive' : 'default'} onClick={() => changeStatus(s)}>
                      {t('order', s)}
                    </Button>
                  ))}
                </div>
              )}
            </>)}
            {tab === 'items' && (
              <TableWrap><table className="w-full text-sm">
                <THead><Tr><Th>Sản phẩm</Th><Th>SKU</Th><Th>Giá</Th><Th>SL</Th><Th>Tổng</Th></Tr></THead>
                <tbody>{sel.items.map((it) => <Tr key={it.id}><Td>{it.product_name_snapshot}</Td><Td>{it.sku_snapshot}</Td><Td>{fmtVND(it.unit_price)}</Td><Td>{it.quantity}</Td><Td>{fmtVND(it.total_amount)}</Td></Tr>)}</tbody>
              </table></TableWrap>
            )}
            {tab === 'addr' && (
              <div className="grid gap-2">
                {sel.addresses.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{a.address_type === 'shipping' ? 'Giao hàng' : 'Thanh toán'} · {a.recipient_name} · {a.phone}</div>
                    <div className="text-slate-600">{`${a.address_line}, ${a.ward_name || ''}, ${a.district_name || ''}, ${a.province_name}`}</div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'hist' && (
              <ol className="grid gap-2 text-sm">
                {sel.history.map((h) => (
                  <li key={h.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-medium">{h.from_status ? t('order', h.from_status) + ' → ' : ''}{t('order', h.to_status)}</span>
                    {h.note && <span className="text-slate-500"> ({h.note})</span>}
                    <div className="text-xs text-slate-400">{fmtDate(h.created_at)}</div>
                  </li>
                ))}
              </ol>
            )}
            {tab === 'notes' && (<>
              <div className="grid gap-2 text-sm">
                {sel.notes.map((n) => <p key={n.id} className="rounded-lg bg-slate-50 px-3 py-2">[{fmtDate(n.created_at)}] {n.note}</p>)}
              </div>
              <div className="mt-2 flex gap-2">
                <Input placeholder="Thêm ghi chú..." value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
                <Button onClick={addNote}>Lưu</Button>
              </div>
            </>)}
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
