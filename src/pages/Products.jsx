import { useEffect, useState } from 'react';
import { Plus, Pencil, Upload, Eye, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { mediaUrl, MediaPicker } from '../components/pickers';
import Lightbox from '../components/Lightbox';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Pagination, Empty, Toolbar, PageHeader } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';

export default function Products() {
  const { can } = useAuth();
  const writable = can('products.write');
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, limit: 15, total: 0 });
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [lightbox, setLightbox] = useState(null); // index anh dang xem
  const [form, setForm] = useState({});
  const [vform, setVform] = useState({});

  const load = async (page = 1, quiet = false) => {
    try {
      const { data } = await api.get('/products', { params: { page, limit: pg.limit, search } });
      setRows(data.data); setPg({ page, limit: pg.limit, total: data.pagination.total });
    } catch (e) { if (!quiet) toast.error(errMsg(e)); }
  };
  useEffect(() => {
    api.get('/brands').then((r) => setBrands(r.data)).catch(() => {});
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
    load(1);
  }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(pg.page, true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const openDetail = async (id, quiet = false) => {
    try { const { data } = await api.get(`/products/${id}`); setDetail(data); }
    catch (e) { if (!quiet) toast.error(errMsg(e)); }
  };

  const startEdit = (r) => {
    setForm(r?.id ? { ...r, category_ids: [] } : { status: 'active' });
    setEditing(r?.id ? { ...r } : {});
  };

  const save = async () => {
    if (!form.name || form.base_price === undefined || form.base_price === '') return toast.error('Nhập tên và giá');
    try {
      if (editing?.id) await api.put(`/products/${editing.id}`, form);
      else await api.post('/products', { status: 'active', ...form });
      toast.success('Đã lưu sản phẩm');
      setEditing(null); load(pg.page, true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const addVariant = async () => {
    if (!vform.sku || vform.price === undefined) return toast.error('Nhập SKU và giá');
    try {
      await api.post(`/products/${detail.id}/variants`, vform);
      toast.success('Đã thêm biến thể');
      setVform({}); openDetail(detail.id, true); load(pg.page, true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const viewImage = async (im) => {
    if (im.object_key) {
      const idx = detail.images.findIndex((x) => x.id === im.id);
      setLightbox(idx);
      return;
    }
    try {
      const { data } = await api.get(`/media/${im.media_id}/url`);
      window.open(data.url, '_blank');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const updateImage = async (id, patch, silent = true) => {
    try {
      const { data } = await api.put(`/product-images/${id}`, patch);
      setDetail((d) => (d ? { ...d, images: d.images.map((x) => (x.id === id ? { ...x, ...data } : x)) } : d));
      if (!silent) toast.success('Đã lưu ảnh');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const deleteImage = async (id) => {
    try {
      await api.delete(`/product-images/${id}`);
      toast.success('Đã xóa ảnh');
      openDetail(detail.id, true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const uploadImage = async (file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: m } = await api.post('/media/upload', fd);
      await linkImage(m.id);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const linkImage = async (mediaId) => {
    if (!mediaId || !detail) return;
    try {
      await api.post(`/products/${detail.id}/images`, { media_id: mediaId, is_primary: detail.images.length === 0 });
      toast.success('Đã thêm ảnh');
      openDetail(detail.id, true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader title="Sản phẩm" actions={writable && <Button onClick={() => startEdit(null)}><Plus />Thêm sản phẩm</Button>} />
      <Card><CardContent className="pt-4">
        <Toolbar>
          <Input placeholder="Tên / SKU..." value={search} className="max-w-[260px]"
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
          <Button onClick={() => load(1)}>Tìm</Button>
        </Toolbar>
        <TableWrap><table className="w-full text-sm">
          <THead><Tr><Th>Tên</Th><Th>Thương hiệu</Th><Th>Giá gốc</Th><Th>Biến thể</Th><Th>Trạng thái</Th><Th /></Tr></THead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td><button className="font-medium text-brand-600 hover:underline" onClick={() => openDetail(r.id)}>{r.name}</button></Td>
                <Td>{r.brand_name}</Td><Td>{fmtVND(r.base_price)}</Td><Td>{r.variant_count}</Td>
                <Td><Badge color={r.status === 'active' ? 'green' : 'default'}>{t('product', r.status)}</Badge></Td>
                <Td><div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => openDetail(r.id)}><Eye />Chi tiết</Button>
                  {writable && <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil />Sửa</Button>}
                </div></Td>
              </Tr>
            ))}
          </tbody>
        </table></TableWrap>
        {!rows.length && <Empty />}
        <Pagination page={pg.page} limit={pg.limit} total={pg.total} onChange={(p) => load(p)} />
      </CardContent></Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên *" className="sm:col-span-2"><Input value={form.name || ''} onChange={(e) => setF('name', e.target.value)} /></Field>
            <Field label="SKU"><Input value={form.sku || ''} onChange={(e) => setF('sku', e.target.value)} /></Field>
            <Field label="Giá gốc (VND) *"><Input type="number" min={0} value={form.base_price ?? ''} onChange={(e) => setF('base_price', Number(e.target.value))} /></Field>
            <Field label="Thương hiệu">
              <select className={inputCls} value={form.brand_id || ''} onChange={(e) => setF('brand_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={form.status || 'active'} onChange={(e) => setF('status', e.target.value)}>
                {opts('product', ['draft', 'active', 'inactive', 'archived']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Danh mục" className="sm:col-span-2">
              <select multiple className={`${inputCls} h-24`} value={form.category_ids || []}
                onChange={(e) => setF('category_ids', [...e.target.selectedOptions].map((o) => Number(o.value)))}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Mô tả ngắn" className="sm:col-span-2">
              <textarea className="flex min-h-[70px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.short_description || ''} onChange={(e) => setF('short_description', e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={save}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Sản phẩm: {detail?.name}</DialogTitle></DialogHeader>
          {detail && (<>
            <h4 className="mb-2 text-sm font-semibold">Biến thể ({detail.variants.length})</h4>
            <TableWrap><table className="w-full text-sm">
              <THead><Tr><Th>SKU</Th><Th>Tên</Th><Th>Giá</Th><Th>Trạng thái</Th></Tr></THead>
              <tbody>{detail.variants.map((v) => <Tr key={v.id}><Td>{v.sku}</Td><Td>{v.name}</Td><Td>{fmtVND(v.price)}</Td><Td><Badge>{t('variant', v.status)}</Badge></Td></Tr>)}</tbody>
            </table></TableWrap>
            {writable && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Input placeholder="SKU *" value={vform.sku || ''} onChange={(e) => setVform({ ...vform, sku: e.target.value })} className="max-w-[160px]" />
                <Input placeholder="Tên (Size M...)" value={vform.name || ''} onChange={(e) => setVform({ ...vform, name: e.target.value })} className="max-w-[160px]" />
                <Input type="number" placeholder="Giá *" min={0} value={vform.price ?? ''} onChange={(e) => setVform({ ...vform, price: Number(e.target.value) })} className="max-w-[140px]" />
                <Button size="sm" onClick={addVariant}><Plus />Thêm biến thể</Button>
              </div>
            )}
            <h4 className="mb-2 mt-4 text-sm font-semibold">Ảnh ({detail.images.length}) — bấm để xem lớn</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {detail.images.map((im, idx) => (
                <div key={im.id} className={`overflow-hidden rounded-lg border ${im.is_primary ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
                  <button onClick={() => viewImage(im)} className="relative block h-24 w-full bg-slate-100">
                    {im.object_key
                      ? <img src={mediaUrl(im.object_key)} alt={im.alt_text || ''} className="h-full w-full object-cover" loading="lazy" />
                      : <span className="flex h-full items-center justify-center text-xs text-slate-400">Ảnh #{im.media_id}</span>}
                    {im.is_primary && <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-medium text-white">Chính</span>}
                  </button>
                  {writable && (
                    <div className="grid gap-1 p-1.5">
                      <Input placeholder="Chú thích..." value={im.alt_text || ''}
                        onChange={(e) => setDetail((d) => ({ ...d, images: d.images.map((x) => (x.id === im.id ? { ...x, alt_text: e.target.value } : x)) }))}
                        onBlur={(e) => updateImage(im.id, { alt_text: e.target.value })} className="h-7 text-xs" />
                      <div className="flex items-center gap-1">
                        <Input type="number" title="Thứ tự" min={0} defaultValue={im.sort_order}
                          onBlur={(e) => updateImage(im.id, { sort_order: Number(e.target.value) || 0 })} className="h-7 w-14 text-xs" />
                        {!im.is_primary && (
                          <Button size="sm" variant="outline" title="Đặt làm ảnh chính" onClick={() => updateImage(im.id, { is_primary: true })}>
                            <Star />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Xóa ảnh" onClick={() => deleteImage(im.id)}>
                          <Trash2 className="text-red-600" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {writable && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50">
                  <Upload className="size-4" />Tải ảnh lên
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) uploadImage(e.target.files[0]); e.target.value = ''; }} />
                </label>
                <MediaPicker value={null} onChange={linkImage} kind="image" />
              </div>
            )}
          </>)}
        </DialogContent>
      </Dialog>

      {detail && (
        <Lightbox
          items={(detail.images || []).map((im) => ({
            src: im.object_key ? mediaUrl(im.object_key) : '',
            caption: im.alt_text || `Ảnh #${im.media_id}`,
          }))}
          index={lightbox} onClose={() => setLightbox(null)} onNav={setLightbox}
        />
      )}
    </div>
  );
}
