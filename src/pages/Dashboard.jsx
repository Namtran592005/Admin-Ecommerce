import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, TrendingUp, TriangleAlert, Phone, Plus, Gift, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t } from '../utils/status';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TableWrap, THead, Tr, Th, Td, Empty } from '../components/ui/table';

const dayKey = (d) => d.toISOString().slice(0, 10);

function Stat({ title, value, icon, tint }) {
  return (
    <Card><CardContent className="pt-5">
      <span className={`mb-2 inline-flex size-11 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-sm text-slate-500">{title}</div>
    </CardContent></Card>
  );
}

export default function Dashboard() {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [bars, setBars] = useState([]);

  const refresh = (quiet = false) => {
    api.get('/reports/summary').then((r) => setData(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    if (can('orders.read')) {
      api.get('/orders', { params: { page: 1, limit: 100 } }).then((r) => {
        const rows = r.data.data || [];
        setRecent(rows.slice(0, 5));
        const map = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          map[dayKey(d)] = { label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), total: 0 };
        }
        rows.forEach((o) => {
          const k = dayKey(new Date(o.created_at));
          if (map[k] && o.status !== 'cancelled') map[k].total += Number(o.total_amount || 0);
        });
        setBars(Object.values(map));
      }).catch(() => {});
    }
  };
  useEffect(() => {
    refresh();
    const id = setInterval(() => { if (document.visibilityState === 'visible') refresh(true); }, 60000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-white" />)}</div>;
  const { all_time, today, top_products, low_stock, by_payment } = data;
  const maxBar = Math.max(1, ...bars.map((b) => b.total));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Tổng quan kinh doanh</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Doanh thu (chưa hủy)" value={fmtVND(all_time.revenue)} icon={<DollarSign className="size-5 text-emerald-700" />} tint="bg-emerald-100" />
        <Stat title="Tổng đơn hàng" value={all_time.total_orders} icon={<ShoppingCart className="size-5 text-brand-600" />} tint="bg-blue-100" />
        <Stat title="Đơn hôm nay" value={today.n} icon={<TrendingUp className="size-5 text-amber-700" />} tint="bg-amber-100" />
        <Stat title="Doanh thu hôm nay" value={fmtVND(today.revenue)} icon={<DollarSign className="size-5 text-violet-700" />} tint="bg-violet-100" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="grid content-start gap-4 lg:col-span-3">
          <Card>
            <CardHeader className="pb-1"><CardTitle>Doanh thu 7 ngày gần nhất</CardTitle></CardHeader>
            <CardContent className="pt-1">
              {bars.length ? (
                <div className="flex h-28 items-end gap-2.5">
                  {bars.map((b) => (
                    <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                      <span className="text-[11px] font-semibold">{b.total >= 1000 ? (b.total / 1000).toFixed(0) + 'k' : b.total}</span>
                      <div className="w-full max-w-11 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-500/70" style={{ height: Math.max(4, (b.total / maxBar) * 68) }} />
                      <span className="text-[11px] text-slate-500">{b.label}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">Không có quyền xem đơn hàng.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Đơn mới nhất</CardTitle></CardHeader>
            <CardContent>
              {recent.length ? (
                <TableWrap><table className="w-full min-w-[520px] text-sm">
                  <THead><Tr><Th>Mã đơn</Th><Th>Trạng thái</Th><Th>Tổng</Th><Th>Ngày</Th></Tr></THead>
                  <tbody>{recent.map((o) => <Tr key={o.id}><Td>{o.order_number}</Td><Td><Badge color="blue">{t('order', o.status)}</Badge></Td><Td>{fmtVND(o.total_amount)}</Td><Td>{fmtDate(o.created_at)}</Td></Tr>)}</tbody>
                </table></TableWrap>
              ) : <Empty />}
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Thao tác nhanh</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {can('orders.write') && <Link to="/pos"><Button><Phone />Tạo đơn</Button></Link>}
              {can('products.write') && <Link to="/products"><Button variant="outline"><Plus />Thêm sản phẩm</Button></Link>}
              {can('promotions.write') && <Link to="/promotions"><Button variant="outline"><Gift />Tạo coupon</Button></Link>}
              {can('inventory.write') && <Link to="/inventory"><Button variant="outline"><Warehouse />Nhập tồn</Button></Link>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-1.5"><TriangleAlert className="size-4 text-amber-600" />Tồn kho sắp hết</CardTitle></CardHeader>
            <CardContent>
              {low_stock.length ? (
                <TableWrap><table className="w-full min-w-[320px] text-sm">
                  <THead><Tr><Th>Kho</Th><Th>Biến thể</Th><Th>Khả dụng</Th></Tr></THead>
                  <tbody>{low_stock.map((r) => <Tr key={r.warehouse_id + '-' + r.variant_id}><Td>{r.warehouse_id}</Td><Td>{r.variant_id}</Td><Td>{r.available_quantity}</Td></Tr>)}</tbody>
                </table></TableWrap>
              ) : <Empty text="Tồn kho ổn định" />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sản phẩm bán chạy</CardTitle></CardHeader>
            <CardContent>
              <TableWrap><table className="w-full min-w-[320px] text-sm">
                <THead><Tr><Th>Sản phẩm</Th><Th>SL</Th><Th>Doanh thu</Th></Tr></THead>
                <tbody>{top_products.map((p) => <Tr key={p.product_id}><Td>{p.name}</Td><Td>{p.qty}</Td><Td>{fmtVND(p.revenue)}</Td></Tr>)}</tbody>
              </table></TableWrap>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Đơn theo thanh toán</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {(by_payment || []).map((p) => <Badge key={p.payment_status}>{t('pay', p.payment_status)}: {p.n}</Badge>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
