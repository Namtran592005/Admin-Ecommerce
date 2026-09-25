import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { opts, t } from '../utils/status';
import { MediaPicker, mediaUrl } from '../components/pickers';
import Lightbox from '../components/Lightbox';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { Empty, PageHeader, Pagination, TableWrap, THead, Th, Td, Toolbar, Tr } from '../components/ui/table';
import { ConfirmDialog, IconButton, RowActions, StatusBadge } from '../components/ui/misc';
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
  const [lightbox, setLightbox] = useState(null);
  const [form, setForm] = useState({});
  const [vform, setVform] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null);

  const load = async (page = 1, quiet = false) => {
    try {
      const { data } = await api.get('/products', { params: { page, limit: pg.limit, search } });
      setRows(data.data);
      setPg({ page, limit: pg.limit, total: data.pagination.total });
    } catch (e) {
      if (!quiet) toast.error(errMsg(e));
    }
  };

  useEffect(() => {
    api.get('/brands').then((response) => setBrands(response.data)).catch(() => {});
    api.get('/categories').then((response) => setCats(response.data)).catch(() => {});
    load(1);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(pg.page, true);
    }, 45000);
    return () => clearInterval(id);
  }, []);

  const openDetail = async (id, quiet = false) => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setDetail(data);
    } catch (e) {
      if (!quiet) toast.error(errMsg(e));
    }
  };

  const startEdit = async (row) => {
    if (!row?.id) {
      setForm({ status: 'active' });
      setEditing({});
      return;
    }
    try {
      const { data } = await api.get(`/products/${row.id}`);
      setForm({ ...data, category_ids: (data.categories || []).map((category) => category.id) });
      setEditing(data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const save = async () => {
    if (!form.name || form.base_price === undefined || form.base_price === '') return toast.error('Vui nhập tên và giá');
    setSaving(true);
    try {
      if (editing?.id) await api.put(`/products/${editing.id}`, form);
      else await api.post('/products', { status: 'active', ...form });
      toast.success('Đã lưu sản phẩm');
      setEditing(null);
      await load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (row) => {
    if (statusBusy) return;
    const status = row.status === 'active' ? 'inactive' : 'active';
    setStatusBusy(row.id);
    try {
      await api.patch(`/products/${row.id}/status`, { status });
      toast.success(status === 'inactive' ? 'Đã ẩn sản phẩm' : 'Đã hiện thị sản phẩm');
      await load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setStatusBusy(null);
    }
  };

  const archiveProduct = async () => {
    const target = deleteTarget;
    if (!target) return;
    try {
      await api.delete(`/products/${target.id}`);
      toast.success('Đã xóa sản phẩm');
      if (editing?.id === target.id) setEditing(null);
      if (detail?.id === target.id) setDetail(null);
      await load(pg.page, true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        toast.error(errMsg(e));
        setForceDeleteTarget({
          ...target,
          orderCount: Number(e.response.data.order_count) || 0,
        });
      } else {
        toast.error(errMsg(e));
      }
    }
  };

  const forceDeleteProduct = async () => {
    const target = forceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/products/${target.id}/permanent?force=1`);
      toast.success('Đã xóa vĩnh viễn sản phẩm');
      setForceDeleteTarget(null);
      if (editing?.id === target.id) setEditing(null);
      if (detail?.id === target.id) setDetail(null);
      await load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const addVariant = async () => {
    if (!vform.sku || vform.price === undefined) return toast.error('Vui nhập SKU và giá');
    try {
      await api.post(`/products/${detail.id}/variants`, vform);
      toast.success('Đã thêm biến thể');
      setVform({});
      openDetail(detail.id, true);
      load(pg.page, true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const viewImage = async (image) => {
    if (image.object_key) {
      const index = detail.images.findIndex((item) => item.id === image.id);
      setLightbox(index);
      return;
    }
    try {
      const { data } = await api.get(`/media/${image.media_id}/url`);
      window.open(data.url, '_blank');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const updateImage = async (id, patch, silent = true) => {
    try {
      const { data } = await api.put(`/product-images/${id}`, patch);
      setDetail((value) => value ? { ...value, images: value.images.map((image) => image.id === id ? { ...image, ...data } : image) } : value);
      if (!silent) toast.success('Đã lưu ảnh');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const deleteImage = async (id) => {
    try {
      await api.delete(`/product-images/${id}`);
      toast.success('Đã xóa ảnh');
      openDetail(detail.id, true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: media } = await api.post('/media/upload', formData);
      await linkImage(media.id);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const linkImage = async (mediaId) => {
    if (!mediaId || !detail) return;
    try {
      await api.post(`/products/${detail.id}/images`, { media_id: mediaId, is_primary: detail.images.length === 0 });
      toast.success('Đã thêm ảnh');
      openDetail(detail.id, true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const setF = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <PageHeader title="Sản phẩm" actions={writable && <Button onClick={() => startEdit(null)}><Plus />Thêm sản phẩm</Button>} />
      <Card>
        <CardContent className="pt-4">
          <Toolbar>
            <Input
              placeholder="Tên / SKU..."
              value={search}
              className="max-w-[260px]"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
            />
            <Button onClick={() => load(1)}>Tìm</Button>
          </Toolbar>
          <TableWrap>
            <table className="w-full text-sm">
              <THead>
                <Tr>
                  <Th>Tên</Th>
                  <Th>Thương hiệu</Th>
                  <Th>Giá gốc</Th>
                  <Th>Biến thể</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Thao tác</Th>
                </Tr>
              </THead>
              <tbody>
                {rows.map((row) => (
                  <Tr
                    key={row.id}
                    className={row.status === 'archived' ? 'bg-slate-50 text-slate-500' : row.status === 'inactive' ? 'text-slate-600' : undefined}
                  >
                    <Td>
                      <button className="font-medium text-brand-600 hover:underline" onClick={() => openDetail(row.id)}>{row.name}</button>
                    </Td>
                    <Td>{row.brand_name}</Td>
                    <Td>{fmtVND(row.base_price)}</Td>
                    <Td>{row.variant_count}</Td>
                    <Td><StatusBadge group="product" value={row.status} /></Td>
                    <Td>
                      <RowActions>
                        <Button size="sm" variant="outline" onClick={() => openDetail(row.id)}><Eye />Chi tiết</Button>
                        {writable && (
                          <>
                            <IconButton
                              label={row.status === 'active' ? 'Ẩn sản phẩm' : 'Hiện thị sản phẩm'}
                              onClick={() => toggleProductStatus(row)}
                              disabled={statusBusy === row.id}
                            >
                              {row.status === 'active' ? <Eye /> : <EyeOff />}
                            </IconButton>
                            <Button size="sm" variant="outline" onClick={() => startEdit(row)}><Pencil />Sửa</Button>
                          </>
                        )}
                      </RowActions>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          {!rows.length && <Empty />}
          <Pagination page={pg.page} limit={pg.limit} total={pg.total} onChange={(page) => load(page)} />
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!saving && !open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên *" className="sm:col-span-2"><Input value={form.name || ''} onChange={(e) => setF('name', e.target.value)} /></Field>
            <Field label="SKU"><Input value={form.sku || ''} onChange={(e) => setF('sku', e.target.value)} /></Field>
            <Field label="Giá gốc (VND) *"><Input type="number" min={0} value={form.base_price ?? ''} onChange={(e) => setF('base_price', Number(e.target.value))} /></Field>
            <Field label="Thương hiệu">
              <select className={inputCls} value={form.brand_id || ''} onChange={(e) => setF('brand_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={form.status || 'active'} onChange={(e) => setF('status', e.target.value)}>
                {opts('product', ['draft', 'active', 'inactive', 'archived']).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Danh mục" className="sm:col-span-2">
              <select
                multiple
                className={`${inputCls} h-24`}
                value={form.category_ids || []}
                onChange={(e) => setF('category_ids', [...e.target.selectedOptions].map((option) => Number(option.value)))}
              >
                {cats.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <Field label="Mô tả ngắn" className="sm:col-span-2">
              <textarea className="flex min-h-[70px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.short_description || ''} onChange={(e) => setF('short_description', e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            {editing?.id && (
              <Button variant="destructive" onClick={() => setDeleteTarget(editing)}>
                <Trash2 />Xóa
              </Button>
            )}
            <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>Hủy</Button>
            <Button disabled={saving} onClick={save}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Sản phẩm: {detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <>
              <h4 className="mb-2 text-sm font-semibold">Biến thể ({detail.variants.length})</h4>
              <TableWrap>
                <table className="w-full text-sm">
                  <THead><Tr><Th>SKU</Th><Th>Tên</Th><Th>Giá</Th><Th>Trạng thái</Th></Tr></THead>
                  <tbody>{detail.variants.map((variant) => <Tr key={variant.id}><Td>{variant.sku}</Td><Td>{variant.name}</Td><Td>{fmtVND(variant.price)}</Td><Td><Badge>{t('variant', variant.status)}</Badge></Td></Tr>)}</tbody>
                </table>
              </TableWrap>
              {writable && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Input placeholder="SKU *" value={vform.sku || ''} onChange={(e) => setVform((value) => ({ ...value, sku: e.target.value }))} className="max-w-[160px]" />
                  <Input placeholder="Tên (Cỡ M...)" value={vform.name || ''} onChange={(e) => setVform((value) => ({ ...value, name: e.target.value }))} className="max-w-[160px]" />
                  <Input type="number" placeholder="Giá *" min={0} value={vform.price ?? ''} onChange={(e) => setVform((value) => ({ ...value, price: Number(e.target.value) }))} className="max-w-[140px]" />
                  <Button size="sm" onClick={addVariant}><Plus />Thêm biến thể</Button>
                </div>
              )}
              <h4 className="mb-2 mt-4 text-sm font-semibold">Ảnh ({detail.images.length}) — bấm để xem lớn</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {detail.images.map((image) => (
                  <div key={image.id} className={`overflow-hidden rounded-lg border ${image.is_primary ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
                    <button onClick={() => viewImage(image)} className="relative block h-24 w-full bg-slate-100">
                      {image.object_key
                        ? <img src={mediaUrl(image.object_key)} alt={image.alt_text || ''} className="h-full w-full object-cover" loading="lazy" />
                        : <span className="flex h-full items-center justify-center text-xs text-slate-400">Ảnh #{image.media_id}</span>}
                      {image.is_primary && <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-medium text-white">Chính</span>}
                    </button>
                    {writable && (
                      <div className="grid gap-1 p-1.5">
                        <Input
                          placeholder="Chú thích..."
                          value={image.alt_text || ''}
                          onChange={(e) => setDetail((value) => ({ ...value, images: value.images.map((item) => item.id === image.id ? { ...item, alt_text: e.target.value } : item) }))}
                          onBlur={(e) => updateImage(image.id, { alt_text: e.target.value })}
                          className="h-7 text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <Input type="number" title="Thứ tự" min={0} defaultValue={image.sort_order} onBlur={(e) => updateImage(image.id, { sort_order: Number(e.target.value) || 0 })} className="h-7 w-14 text-xs" />
                          {!image.is_primary && (
                            <Button size="sm" variant="outline" title="Đặt làm ảnh chính" onClick={() => updateImage(image.id, { is_primary: true })}>
                              <Star />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Xóa ảnh" onClick={() => deleteImage(image.id)}>
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
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa sản phẩm"
        description={`Sản phẩm “${deleteTarget?.name || ''}” sẽ được chuyển sang trạng thái lưu trữ và ẩn khỏi danh sách. Dữ liệu vẫn được giữ.`}
        onConfirm={archiveProduct}
      />

      <ConfirmDialog
        open={!!forceDeleteTarget}
        onOpenChange={(open) => !open && setForceDeleteTarget(null)}
        title="Xóa vĩnh viễn sản phẩm?"
        description={`Sản phẩm “${forceDeleteTarget?.name || ''}” có ${forceDeleteTarget?.orderCount || 0} đơn hàng chưa hủy. Xóa vĩnh viễn sẽ gỡ sản phẩm khỏi dữ liệu và không thể khôi phục.`}
        confirmText="Xóa vĩnh viễn"
        onConfirm={forceDeleteProduct}
      />

      {detail && (
        <Lightbox
          items={(detail.images || []).map((image) => ({
            src: image.object_key ? mediaUrl(image.object_key) : '',
            caption: image.alt_text || `Ảnh #${image.media_id}`,
          }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNav={setLightbox}
        />
      )}
    </div>
  );
}
