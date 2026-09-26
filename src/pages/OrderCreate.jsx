import { useEffect, useState } from 'react';
import { Search, Plus, Trash2, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND } from '../api/client';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';
import { Field } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty } from '../components/ui/table';
import { cn } from '../lib/utils';

// Tạo đơn hộ khách: wizard 5 bước — tìm khách → chọn hàng → giao/thanh toán → xác nhận → hoàn tất.
const STEPS = ['Khách hàng', 'Món hàng', 'Giao & thanh toán', 'Xác nhận', 'Hoàn tất'];

export default function OrderCreate() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [custAddrs, setCustAddrs] = useState([]);
  const [lines, setLines] = useState([]);
  const [pQuery, setPQuery] = useState('');
  const [pResults, setPResults] = useState([]);
  const [pDetail, setPDetail] = useState(null);
  const [addr, setAddr] = useState({ recipient_name: '', phone: '', email: '', province_name: '', district_name: '', ward_name: '', address_line: '' });
  const [coupon, setCoupon] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [payMethods, setPayMethods] = useState([]);
  const [shipMethods, setShipMethods] = useState([]);
  const [payCode, setPayCode] = useState('cod');
  const [shipCode, setShipCode] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    api.get('/payments/methods').then((r) => setPayMethods(r.data)).catch(() => {});
    api.get('/shipping/methods').then((r) => setShipMethods(r.data)).catch(() => {});
  }, []);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipFee = couponInfo?.coupon?.type === 'free_shipping' ? 0 : Number(shipMethods.find((m) => m.code === shipCode)?.base_fee ?? 30000);
  const discount = couponInfo?.valid ? Number(couponInfo.discount_amount || 0) : 0;
  const total = Math.max(0, subtotal - discount + shipFee);
  const setA = (k, v) => setAddr((a) => ({ ...a, [k]: v }));

  const searchCustomer = async () => {
    if (!phone.trim()) return;
    try {
      const { data } = await api.get('/users', { params: { search: phone.trim(), limit: 5 } });
      setFound(data.data || []);
      if (!data.data?.length) toast.info('Không thấy khách này — có thể tạo đơn vãng lai');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const pickCustomer = async (u) => {
    try {
      const { data } = await api.get(`/users/${u.id}`);
      setCustomer({ id: u.id, email: u.email, phone: u.phone });
      const addrs = data.addresses || [];
      setCustAddrs(addrs);
      const d = addrs.find((a) => a.is_default) || addrs[0];
      if (d) setAddr({
        recipient_name: d.recipient_name || '', phone: d.phone || u.phone || '',
        email: u.email || '', province_name: d.province_name || '', district_name: d.district_name || '',
        ward_name: d.ward_name || '', address_line: d.address_line || '',
      });
      else setAddr((a) => ({ ...a, phone: u.phone || '', email: u.email || '' }));
      toast.success('Đã chọn khách #' + u.id);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const searchProduct = async () => {
    if (!pQuery.trim()) return;
    try {
      const { data } = await api.get('/products', { params: { search: pQuery.trim(), limit: 10 } });
      setPResults(data.data || []);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const pickProduct = async (p) => {
    try {
      const { data } = await api.get(`/products/slug/${p.slug}`);
      setPDetail(data);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const addLine = (v) => {
    if (v.available_qty <= 0) return toast.warning('Sản phẩm đã hết hàng');
    setLines((ls) => {
      const ex = ls.find((l) => l.variant_id === v.id);
      if (ex) {
        const nq = Math.min(ex.qty + 1, v.available_qty);
        return ls.map((l) => (l.variant_id === v.id ? { ...l, qty: nq } : l));
      }
      return [...ls, { variant_id: v.id, sku: v.sku, name: v.name || v.sku, price: Number(v.price), available: v.available_qty, qty: 1 }];
    });
  };

  const checkCoupon = async () => {
    if (!coupon.trim()) return setCouponInfo(null);
    try {
      const { data } = await api.post('/promos/coupons/validate', { code: coupon.trim(), order_amount: subtotal });
      setCouponInfo(data);
      toast[data.valid ? 'success' : 'warning'](data.valid ? `Áp dụng: giảm ${fmtVND(data.discount_amount)}` : data.error);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const nextFromItems = () => {
    if (!lines.length) return toast.warning('Chưa có món hàng nào');
    setStep(2);
  };

  const nextFromCustomer = () => {
    if (!customer) setCustomer({ guest: true });
    setStep(1);
  };

  const submit = async () => {
    if (!lines.length) return toast.warning('Chưa có món hàng nào');
    if (!addr.recipient_name || !addr.phone || !addr.province_name || !addr.address_line)
      return toast.warning('Điền đủ tên, SĐT, tỉnh, địa chỉ giao hàng');
    setPlacing(true);
    try {
      const { data } = await api.post('/orders/checkout', {
        items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.qty })),
        shipping_address: addr, coupon_code: coupon.trim() || undefined,
        payment_method_code: payCode, shipping_method_code: shipCode || undefined,
        customer_note: '[NV đặt hộ] ' + note,
        user_id: customer && !customer.guest ? customer.id : undefined,
      });
      setDone(data);
      setStep(4);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setPlacing(false); }
  };

  const reset = () => {
    setStep(0); setCustomer(null); setLines([]); setCoupon(''); setCouponInfo(null);
    setNote(''); setDone(null); setFound([]); setPResults([]); setPDetail(null); setPhone('');
  };


  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Tạo đơn</h1>

      {/* px-5 đặt ở ngoài <ol> để <ol> trùng khớp đúng vùng nội dung của Card.
          Nếu đặt padding vào chính <ol>, phần trăm của vạch nối sẽ tính trên
          cả padding-box nên vạch lệch khỏi tâm vòng tròn. */}
      <div className="mb-4 px-5">
        <ol className="relative grid grid-cols-5">
          {/* Vạch nối chạy từ tâm vòng tròn đầu tới tâm vòng tròn cuối (10% -> 90%),
              nên các bước luôn đều nhau kể cả khi nhãn dài khác nhau. Phần đã đi
              được tô xanh theo đúng tỉ lệ bước đã hoàn thành. */}
          <span aria-hidden="true" className="pointer-events-none absolute top-4 right-[10%] left-[10%] h-0.5 rounded bg-slate-200">
            <span
              className="block h-full rounded bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${(Math.min(step, STEPS.length - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </span>
          {STEPS.map((s, i) => (
            <li key={s} className="relative flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? 'step' : undefined}
                className="flex flex-col items-center gap-1.5"
              >
                <span className={cn('flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-500 text-white shadow' : 'bg-slate-200 text-slate-500')}>
                  {i < step ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn('text-center text-xs leading-tight', i === step ? 'font-semibold text-brand-600' : 'text-slate-500')}>{s}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <Card>
        <CardContent className="pt-5">
          {step === 0 && (<>
            <div className="flex max-w-md gap-2">
              <Input placeholder="SĐT hoặc email khách..." value={phone}
                onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCustomer()} />
              <Button variant="outline" onClick={searchCustomer}><Search />Tìm</Button>
            </div>
            {found.map((u) => (
              <div key={u.id} className="mt-2 flex max-w-md items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>#{u.id} · {u.email || u.phone}</span>
                <Button size="sm" onClick={() => pickCustomer(u)}>Chọn</Button>
              </div>
            ))}
            <div className="mt-3 text-sm text-slate-500">
              {customer ? (customer.guest ? 'Khách vãng lai' : `Khách #${customer.id} ${customer.email || customer.phone}`) : 'Chưa chọn khách (mặc định vãng lai)'}
            </div>
          </>)}

          {step === 1 && (<>
            <div className="flex max-w-md gap-2">
              <Input placeholder="Tìm sản phẩm theo tên/SKU..." value={pQuery}
                onChange={(e) => setPQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchProduct()} />
              <Button variant="outline" onClick={searchProduct}><Search /></Button>
            </div>
            {pDetail ? (
              <div className="mt-2 rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{pDetail.name}</span>
                  <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => { setPDetail(null); setPResults([]); }}>Tìm món khác</button>
                </div>
                {(pDetail.variants || []).map((v) => (
                  <div key={v.id} className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{v.sku}</span>
                    <span className="flex-1">{v.name}</span><b>{fmtVND(v.price)}</b>
                    <Button size="sm" disabled={v.available_qty <= 0} onClick={() => addLine(v)}><Plus />Thêm ({v.available_qty})</Button>
                  </div>
                ))}
              </div>
            ) : pResults.map((p) => (
              <div key={p.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="truncate">{p.name} · {fmtVND(p.base_price)}</span>
                <Button size="sm" variant="outline" onClick={() => pickProduct(p)}>Chọn</Button>
              </div>
            ))}
            {lines.length > 0 && (
              <TableWrap><table className="mt-2 w-full text-sm">
                <THead><Tr><Th>Tên</Th><Th>Giá</Th><Th>SL</Th><Th>Tổng</Th><Th /></Tr></THead>
                <tbody>{lines.map((l) => (
                  <Tr key={l.variant_id}>
                    <Td>{l.name}</Td><Td>{fmtVND(l.price)}</Td>
                    <Td><Input type="number" min={1} max={l.available} value={l.qty} className="w-20"
                      onChange={(e) => setLines((ls) => ls.map((x) => (x.variant_id === l.variant_id ? { ...x, qty: Math.min(Number(e.target.value) || 1, l.available) } : x)))} /></Td>
                    <Td>{fmtVND(l.price * l.qty)}</Td>
                    <Td><Button size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((x) => x.variant_id !== l.variant_id))}><Trash2 className="text-red-600" /></Button></Td>
                  </Tr>
                ))}</tbody>
              </table></TableWrap>
            )}
          </>)}

          {step === 2 && (
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                {custAddrs.map((a) => (
                  <button key={a.id} onClick={() => setAddr({
                    recipient_name: a.recipient_name, phone: a.phone, email: customer.email || '',
                    province_name: a.province_name, district_name: a.district_name || '',
                    ward_name: a.ward_name || '', address_line: a.address_line,
                  })} className="rounded-lg border px-2.5 py-1.5 text-xs hover:border-brand-500">{a.address_line}</button>
                ))}
              </div>
              {[['recipient_name', 'Người nhận *', ''], ['phone', 'SĐT *', ''], ['province_name', 'Tỉnh/Thành *', ''], ['district_name', 'Quận/Huyện', ''], ['ward_name', 'Phường/Xã', ''], ['address_line', 'Số nhà, đường *', '']].map(([k, label]) => (
                <label key={k} className="grid gap-1.5 text-sm font-medium text-slate-700">{label}
                  <Input value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} />
                </label>
              ))}
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Thanh toán
                <Select value={payCode} onChange={(e) => setPayCode(e.target.value)}>
                  {payMethods.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Giao hàng
                <Select value={shipCode} onChange={(e) => setShipCode(e.target.value)}>
                  <option value="">Mặc định</option>
                  {shipMethods.map((m) => <option key={m.code} value={m.code}>{m.name} (+{fmtVND(m.base_fee)})</option>)}
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Mã giảm giá
                <span className="flex gap-2">
                  <Input value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponInfo(null); }} />
                  <Button variant="outline" onClick={checkCoupon}>Áp dụng</Button>
                </span>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Ghi chú
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
          )}

          {step === 3 && (
            <dl className="grid max-w-xl gap-x-6 gap-y-2 text-sm">
              {[['Khách', customer?.guest ? 'Vãng lai' : customer ? `#${customer.id} ${customer.email || customer.phone}` : 'Vãng lai'],
                ['Nhận hàng', `${addr.recipient_name} · ${addr.phone} · ${addr.address_line}, ${addr.province_name}`],
                ['Món hàng', lines.map((l) => `${l.name} × ${l.qty}`).join('; ')],
                ['Tạm tính', fmtVND(subtotal)], ['Giảm giá', '-' + fmtVND(discount)], ['Phí ship', '+' + fmtVND(shipFee)],
              ].map(([k, v]) => <div key={k} className="flex justify-between border-b border-slate-100 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
              <div className="flex justify-between py-1.5 text-base"><dt className="font-semibold">Tổng thu</dt><dd className="font-bold">{fmtVND(total)}</dd></div>
            </dl>
          )}
          {step === 4 && done && (
            <div className="py-6 text-center">
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100"><Check className="size-6 text-emerald-700" /></span>
              <h2 className="text-lg font-semibold">Đã tạo đơn thành công</h2>
              <p className="mt-1 text-sm text-slate-500">Mã đơn <b>{done.order_number}</b> · Tổng <b>{fmtVND(done.total_amount)}</b></p>
              <p className="text-sm text-slate-500">Khách: {done.user_id ? `#${done.user_id}` : 'Vãng lai'} · Thanh toán: {done.payment_status}</p>
            </div>
          )}
        </CardContent>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-b-xl border-t bg-white/95 px-5 py-3 backdrop-blur">
          {step < 4 ? (<>
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ArrowLeft />Quay lại
            </Button>
            <span className="text-sm text-slate-500">Tổng: <b className="text-ink">{fmtVND(total)}</b></span>
            {step < 2 && <Button onClick={() => step === 0 ? nextFromCustomer() : nextFromItems()}>Tiếp tục<ArrowRight /></Button>}
            {step === 2 && <Button onClick={() => setStep(3)}>Tiếp tục<ArrowRight /></Button>}
            {step === 3 && <Button onClick={submit} disabled={placing}>{placing ? 'Đang chốt...' : 'Chốt đơn'}</Button>}
          </>) : (
            <>
              <span />
              <Button onClick={reset}>Tạo đơn khác</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
