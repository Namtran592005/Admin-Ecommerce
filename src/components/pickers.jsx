import { useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND } from '../api/client';
import { t } from '../utils/status';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';

const mediaBase = () => (import.meta.env.VITE_FILES_BASE || 'http://127.0.0.1:9000/unimate').replace(/\/$/, '');
export const mediaUrl = (key) => `${mediaBase()}/${key}`;

// Chọn biến thể: tìm sản phẩm -> chọn biến thể (kèm tồn)
export function VariantPicker({ onPick }) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState([]);
  const [detail, setDetail] = useState(null);
  const search = async () => {
    if (!q.trim()) return;
    try {
      const { data } = await api.get('/products', { params: { search: q.trim(), limit: 8 } });
      setProducts(data.data || []);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const pick = async (p) => {
    try {
      const { data } = await api.get(`/products/slug/${p.slug}`);
      setDetail(data);
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input placeholder="Tìm sản phẩm theo tên/SKU..." value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <Button variant="outline" onClick={search}><Search />Tìm</Button>
      </div>
      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="truncate">{p.name} · {fmtVND(p.base_price)}</span>
          <Button size="sm" variant="outline" onClick={() => pick(p)}>Chọn</Button>
        </div>
      ))}
      {(detail?.variants || []).map((v) => (
        <div key={v.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <Badge>{v.sku}</Badge>
          <span className="flex-1 truncate">{v.name} · {fmtVND(v.price)}</span>
          <Badge color={v.available_qty > 0 ? 'green' : 'red'}>Còn {v.available_qty}</Badge>
          <Button size="sm" onClick={() => onPick(v, detail)}>Chọn</Button>
        </div>
      ))}
    </div>
  );
}

// Chọn đơn hàng: tìm theo mã đơn
export function OrderPicker({ value, onChange, placeholder = 'Tìm mã đơn ORD...', disabled }) {
  const [options, setOptions] = useState([]);
  const search = async (s) => {
    if (!s) return;
    try {
      const { data } = await api.get('/orders', { params: { search: s, limit: 10 } });
      setOptions((data.data || []).map((o) => ({ value: o.id, label: `${o.order_number} · ${fmtVND(o.total_amount)} · ${t('order', o.status)}` })));
    } catch { /* ignore */ }
  };
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      onFocus={() => { if (!options.length) search('ORD'); }}
      disabled={disabled}
      className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Chọn ảnh từ thư viện (xem trước). kind: 'all' | 'image'
export function MediaPicker({ value, onChange, kind = 'all' }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const load = async () => {
    try {
      const { data } = await api.get('/media');
      setRows(data || []);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const isImg = (m) => (m.mime_type || '').startsWith('image/');
  const filtered = rows.filter((m) =>
    (kind === 'all' || (kind === 'image' && isImg(m))) &&
    (!q || (m.original_name || '').toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="flex items-center gap-2">
        <Input value={value || ''} placeholder="Chưa chọn ảnh" readOnly className="w-28" />
        <Button type="button" variant="outline" onClick={() => { setOpen(true); load(); }}>Chọn từ thư viện</Button>
        {value && <Button type="button" variant="ghost" onClick={() => onChange(null)}><X />Xóa</Button>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Chọn ảnh</DialogTitle></DialogHeader>
          <Input placeholder="Tìm theo tên file..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((m) => (
              <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
                className="overflow-hidden rounded-lg border text-left hover:border-brand-500">
                {isImg(m)
                  ? <img src={mediaUrl(m.object_key)} alt="" className="h-24 w-full object-cover" loading="lazy" />
                  : <span className="flex h-24 items-center justify-center bg-slate-100 text-xs text-slate-500">{m.mime_type}</span>}
                <span className="block truncate px-2 py-1 text-xs">#{m.id} {m.original_name}</span>
              </button>
            ))}
          </div>
          {!filtered.length && <p className="py-6 text-center text-sm text-slate-500">Không có ảnh phù hợp. Hãy tải lên ở trang Thư viện trước.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PickedTag({ text, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
      <Check className="size-3.5" />{text}
      {onClear && (
        <button type="button" onClick={onClear} className="rounded p-0.5 hover:bg-blue-200" aria-label="Bỏ chọn">
          <X className="size-3.5" />
        </button>
      )}
    </span>
  );
}
