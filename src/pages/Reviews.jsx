import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, Toolbar, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';

export default function Reviews() {
  const { can } = useAuth();
  const canReview = can('reviews.write');
  const canReturn = can('returns.write');
  const [tab, setTab] = useState('ret');
  const [productId, setProductId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [returns, setReturns] = useState([]);

  const loadReturns = (quiet = false) => api.get('/returns').then((r) => setReturns(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
  useEffect(() => { loadReturns(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') loadReturns(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const loadReviews = () => {
    if (!productId) return toast.warning('Nhập ID sản phẩm để xem đánh giá');
    api.get(`/products/${productId}/reviews`).then((r) => setReviews(r.data)).catch((e) => toast.error(errMsg(e)));
  };
  const reviewStatus = async (id, status) => {
    try { await api.patch(`/reviews/${id}/status`, { status }); toast.success('Đã cập nhật'); loadReviews(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const returnStatus = async (id, status) => {
    try { await api.patch(`/returns/${id}/status`, { status }); toast.success('Đã cập nhật'); loadReturns(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Đánh giá & Đổi trả" />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: 'ret', label: 'Đổi trả' }, { key: 'rev', label: 'Đánh giá' }]} />
        {tab === 'ret' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số</Th><Th>Đơn</Th><Th>Lý do</Th><Th>Trạng thái</Th><Th>Ngày</Th><Th /></Tr></THead>
            <tbody>{returns.map((r) => (
              <Tr key={r.id}>
                <Td>{r.return_number}</Td><Td>{r.order_id}</Td><Td>{r.reason_code}</Td>
                <Td><Badge>{t('ret', r.status)}</Badge></Td>
                <Td className="whitespace-nowrap">{fmtDate(r.requested_at)}</Td>
                <Td>{canReturn && (
                  <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={r.status}
                    onChange={(e) => returnStatus(r.id, e.target.value)}>
                    {opts('ret', ['requested', 'approved', 'rejected', 'customer_shipping', 'received', 'inspecting', 'accepted', 'refunded', 'cancelled']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!returns.length && <Empty />}
        </>)}
        {tab === 'rev' && (<>
          <Toolbar>
            <Input placeholder="ID sản phẩm" value={productId} className="max-w-[160px]" onChange={(e) => setProductId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadReviews()} />
            <Button onClick={loadReviews}>Xem</Button>
          </Toolbar>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Sao</Th><Th>Tiêu đề</Th><Th>Nội dung</Th><Th>Mua thật</Th><Th>Ngày</Th><Th /></Tr></THead>
            <tbody>{reviews.map((r) => (
              <Tr key={r.id}>
                <Td><span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" />{r.rating}</span></Td>
                <Td>{r.title}</Td><Td>{r.content}</Td>
                <Td>{r.is_verified_purchase ? <Badge color="green">Có</Badge> : '—'}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.created_at)}</Td>
                <Td>{canReview && (
                  <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" defaultValue=""
                    onChange={(e) => e.target.value && reviewStatus(r.id, e.target.value)}>
                    <option value="">Duyệt...</option>
                    {opts('review', ['pending', 'published', 'hidden', 'rejected']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}</Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!reviews.length && <Empty text="Nhập ID sản phẩm rồi bấm Xem" />}
        </>)}
      </CardContent></Card>
    </div>
  );
}
