import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';
const TYPE_VI = { fixed: 'Giảm tiền', percentage: 'Giảm %', free_shipping: 'Miễn ship' };

export default function Promotions() {
  const { can } = useAuth();
  const writable = can('promotions.write');
  const [tab, setTab] = useState('cp');
  const [promos, setPromos] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [redems, setRedems] = useState([]);
  const [cOpen, setCOpen] = useState(false);
  const [f, setF] = useState({ type: 'percentage', status: 'active' });

  const load = (quiet = false) => {
    api.get('/promos/promotions').then((r) => setPromos(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/promos/coupons').then((r) => setCoupons(r.data)).catch(() => {});
    api.get('/promos/redemptions').then((r) => setRedems(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const saveCoupon = async () => {
    if (!f.code || f.value === undefined || f.value === '') return toast.error('Nhập mã và giá trị');
    const body = { status: 'active', ...f };
    if (f.from && f.to) {
      body.starts_at = f.from.replace('T', ' ') + ':00';
      body.expires_at = f.to.replace('T', ' ') + ':00';
    }
    delete body.from; delete body.to;
    try { await api.post('/promos/coupons', body); toast.success('Đã tạo coupon'); setCOpen(false); setF({ type: 'percentage', status: 'active' }); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Khuyến mãi" actions={writable && tab === 'cp' && <Button onClick={() => setCOpen(true)}><Plus />Tạo coupon</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'cp', label: 'Mã giảm giá' }, { key: 'pr', label: 'Chương trình KM' }, { key: 'rd', label: 'Lượt dùng coupon' },
        ]} />
        {tab === 'cp' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Loại</Th><Th>Giá trị</Th><Th>Đơn tối thiểu</Th><Th>Đã dùng</Th><Th>Trạng thái</Th><Th>Hết hạn</Th></Tr></THead>
            <tbody>{coupons.map((c) => (
              <Tr key={c.id}>
                <Td><Badge color="gold">{c.code}</Badge></Td><Td>{TYPE_VI[c.type] || c.type}</Td><Td>{c.value}</Td>
                <Td>{fmtVND(c.minimum_order_amount)}</Td><Td>{c.used_count}</Td>
                <Td><Badge color={c.status === 'active' ? 'green' : 'default'}>{t('coupon', c.status)}</Badge></Td>
                <Td className="whitespace-nowrap">{fmtDate(c.expires_at)}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!coupons.length && <Empty />}
        </>)}
        {tab === 'pr' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Tên</Th><Th>Mã</Th><Th>Loại</Th><Th>Giá trị</Th><Th>Trạng thái</Th></Tr></THead>
            <tbody>{promos.map((p) => <Tr key={p.id}><Td>{p.name}</Td><Td>{p.code}</Td><Td>{p.type}</Td><Td>{p.value}</Td>
              <Td><Badge>{t('promo', p.status)}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
          {!promos.length && <Empty />}</>
        )}
        {tab === 'rd' && (
          <><TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Khách</Th><Th>Đơn</Th><Th>Giảm</Th><Th>Lúc</Th></Tr></THead>
            <tbody>{redems.map((r) => <Tr key={r.id}><Td>{r.coupon_id}</Td><Td>{r.user_id}</Td><Td>{r.order_id}</Td>
              <Td>{fmtVND(r.discount_amount)}</Td><Td className="whitespace-nowrap">{fmtDate(r.created_at)}</Td></Tr>)}</tbody>
          </table></TableWrap>
          {!redems.length && <Empty />}</>
        )}
      </CardContent></Card>

      <Dialog open={cOpen} onOpenChange={setCOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Tạo coupon</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã *"><Input placeholder="SALE10" value={f.code || ''} onChange={(e) => set('code', e.target.value)} /></Field>
            <Field label="Loại">
              <select className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value)}>
                <option value="percentage">Giảm %</option><option value="fixed">Giảm tiền</option><option value="free_shipping">Miễn ship</option>
              </select>
            </Field>
            <Field label="Giá trị *"><Input type="number" min={0} value={f.value ?? ''} onChange={(e) => set('value', Number(e.target.value))} /></Field>
            <Field label="Đơn tối thiểu"><Input type="number" min={0} value={f.minimum_order_amount ?? ''} onChange={(e) => set('minimum_order_amount', Number(e.target.value))} /></Field>
            <Field label="Giảm tối đa"><Input type="number" min={0} value={f.maximum_discount_amount ?? ''} onChange={(e) => set('maximum_discount_amount', Number(e.target.value))} /></Field>
            <Field label="Giới hạn lượt"><Input type="number" min={1} value={f.usage_limit ?? ''} onChange={(e) => set('usage_limit', Number(e.target.value))} /></Field>
            <Field label="Bắt đầu"><Input type="datetime-local" value={f.from || ''} onChange={(e) => set('from', e.target.value)} /></Field>
            <Field label="Kết thúc"><Input type="datetime-local" value={f.to || ''} onChange={(e) => set('to', e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCOpen(false)}>Hủy</Button>
            <Button onClick={saveCoupon}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
