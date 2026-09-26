import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input, Field, Select } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, Toolbar } from '../components/ui/table';
import { Tabs, ConfirmDialog, IconButton, RowActions, TableSearch, useRowFilter } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { MediaPicker, mediaUrl } from '../components/pickers';

const CAT_ICONS = ['bi-bag', 'bi-basket', 'bi-basket3', 'bi-tag', 'bi-tags', 'bi-gift', 'bi-house', 'bi-phone', 'bi-laptop', 'bi-controller', 'bi-headphones', 'bi-watch', 'bi-camera', 'bi-bicycle', 'bi-book', 'bi-pencil', 'bi-brush', 'bi-gem', 'bi-lamp', 'bi-tools', 'bi-heart-pulse', 'bi-cup-straw', 'bi-egg-fried', 'bi-cart', 'bi-star', 'bi-truck', 'bi-ticket-perforated'];
const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Văn bản' },
  { value: 'color', label: 'Màu sắc' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'number', label: 'Số' },
];
const ATTRIBUTE_TYPE_LABELS = Object.fromEntries(ATTRIBUTE_TYPES.map((item) => [item.value, item.label]));

const categoryPayload = (value = {}) => {
  const name = (value.name || '').trim();
  return {
    parent_id: value.parent_id ? Number(value.parent_id) : null,
    name,
    slug: value.slug || name,
    description: value.description || null,
    image_media_id: value.image_media_id || null,
    icon: value.icon || null,
    sort_order: Number(value.sort_order) || 0,
    status: value.status || 'active',
  };
};

const brandPayload = (value = {}) => ({
  name: (value.name || '').trim(),
  slug: value.slug || value.name || '',
  description: value.description || null,
  logo_media_id: value.logo_media_id || null,
  status: value.status || 'active',
});

const attributeValuePayload = (value = {}) => ({
  value: (value.value || '').trim(),
  display_value: (value.display_value || '').trim() || null,
  color_hex: value.color_hex || null,
  image_media_id: value.image_media_id || null,
  sort_order: Number(value.sort_order) || 0,
});

function Crud({ title, listUrl, columns, children, form, setForm, editing, setEditing, open, setOpen, canWrite, buildPayload, search, searchPlaceholder }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toggleId, setToggleId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [q, setQ] = useState('');

  const load = (quiet = false) => api.get(listUrl)
    .then((response) => setRows(Array.isArray(response.data) ? response.data : []))
    .catch((e) => { if (!quiet) toast.error(errMsg(e)); });

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({});
    setOpen(true);
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setOpen(false);
    setEditing(null);
    setForm({});
  };

  const save = async () => {
    if (!(form.name || '').trim()) return toast.error(`Vui nhập tên ${title}`);
    setSaving(true);
    try {
      if (editing?.id) await api.put(`${listUrl}/${editing.id}`, buildPayload(form));
      else await api.post(listUrl, buildPayload(form));
      toast.success(editing?.id ? `Đã cập nhật ${title}` : `Đã thêm ${title}`);
      setOpen(false);
      setEditing(null);
      setForm({});
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    if (toggleId) return;
    const status = row.status === 'active' ? 'inactive' : 'active';
    setToggleId(row.id);
    try {
      await api.put(`${listUrl}/${row.id}`, buildPayload({ ...row, status }));
      toast.success(status === 'active' ? 'Đã hiện thị' : 'Đã ẩn');
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setToggleId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`${listUrl}/${deleteTarget.id}`);
      toast.success(`Đã ẩn ${title}`);
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  // Mặc định lấy chuỗi tìm từ các cột dạng chữ/số trong `columns`.
  const searchKeys = useMemo(() => columns.map((c) => c.key).filter((k) => k !== 'image_key' && k !== 'logo_media_id'), [columns]);
  const shown = useRowFilter(rows, q, search
    ? (r) => search(r)
    : (r) => searchKeys.map((k) => (r[k] == null ? '' : r[k])).join(' '));

  return (
    <>
      {canWrite && <Button onClick={startCreate}><Plus />Thêm {title}</Button>}
      <TableSearch value={q} onChange={setQ} placeholder={searchPlaceholder || `Tìm ${title.toLowerCase()}...`} className="mt-3" />
      <TableWrap className="mt-3">
        <table className="w-full text-sm">
          <THead>
            <Tr>
              {columns.map((column) => <Th key={column.key}>{column.title}</Th>)}
              <Th className="text-right">Thao tác</Th>
            </Tr>
          </THead>
          <tbody>
            {shown.map((row) => (
              <Tr key={row.id}>
                {columns.map((column) => (
                  <Td key={column.key}>{column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—')}</Td>
                ))}
                <Td>
                  <RowActions>
                    {canWrite && (
                      <>
                        <IconButton
                          label={row.status === 'active' ? `Ẩn ${title}` : `Hiện thị ${title}`}
                          onClick={() => toggleStatus(row)}
                          disabled={toggleId === row.id}
                        >
                          {row.status === 'active' ? <Eye /> : <EyeOff />}
                        </IconButton>
                        <IconButton label={`Sửa ${title}`} onClick={() => startEdit(row)}>
                          <Pencil />
                        </IconButton>
                        <IconButton label={`Xóa ${title}`} onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="text-red-600" />
                        </IconButton>
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

      <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Sửa ${title}` : `Thêm ${title}`}</DialogTitle>
          </DialogHeader>
          {children}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={closeDialog}>Hủy</Button>
            <Button disabled={saving} onClick={save}>
              {saving ? 'Đang lưu...' : editing?.id ? 'Lưu thay đổi' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title={`Xóa ${title}`}
        description={`Thao tác này sẽ ẩn ${title} khỏi danh sách, vẫn giữ dữ liệu.`}
        confirmText="Ẩn"
        onConfirm={remove}
      />
    </>
  );
}

export default function Catalog() {
  const { can } = useAuth();
  const canWriteCategories = can('categories.write');
  const canWriteProducts = can('products.write');
  const [tab, setTab] = useState('cat');
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState(null);
  const [catForm, setCatForm] = useState({});
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandEditing, setBrandEditing] = useState(null);
  const [brandForm, setBrandForm] = useState({});
  const [attrs, setAttrs] = useState([]);
  const [attrQ, setAttrQ] = useState('');
  const [attrId, setAttrId] = useState('');
  const [attrOpen, setAttrOpen] = useState(false);
  const [attrEditing, setAttrEditing] = useState(null);
  const [attrForm, setAttrForm] = useState({ name: '', code: '', display_type: 'text', sort_order: 0 });
  const [attrDelete, setAttrDelete] = useState(null);
  const [savingAttr, setSavingAttr] = useState(false);
  const [valForm, setValForm] = useState({});
  const [savingVal, setSavingVal] = useState(false);
  const [valueEditing, setValueEditing] = useState(null);
  const [valueForm, setValueForm] = useState({});
  const [savingValueEdit, setSavingValueEdit] = useState(false);
  const [valueDelete, setValueDelete] = useState(null);

  const loadAttrs = (quiet = false) => api.get('/attributes')
    .then((response) => setAttrs(Array.isArray(response.data) ? response.data : []))
    .catch((e) => { if (!quiet) toast.error(errMsg(e)); });

  useEffect(() => { loadAttrs(); }, []);

  const startAttrCreate = () => {
    setAttrEditing(null);
    setAttrForm({ name: '', code: '', display_type: 'text', sort_order: 0 });
    setAttrOpen(true);
  };

  const startAttrEdit = (attribute) => {
    setAttrEditing(attribute);
    setAttrForm({
      name: attribute.name || '',
      code: attribute.code || '',
      display_type: attribute.display_type || 'text',
      sort_order: attribute.sort_order ?? 0,
    });
    setAttrOpen(true);
  };

  const closeAttrDialog = () => {
    if (savingAttr) return;
    setAttrOpen(false);
    setAttrEditing(null);
  };

  const saveAttr = async () => {
    if (!attrForm.name.trim() || !attrForm.code.trim()) return toast.error('Vui nhập tên và mã thuộc tính');
    setSavingAttr(true);
    const payload = {
      name: attrForm.name.trim(),
      code: attrForm.code.trim(),
      display_type: attrForm.display_type || 'text',
      sort_order: Number(attrForm.sort_order) || 0,
    };
    try {
      if (attrEditing?.id) await api.put(`/attributes/${attrEditing.id}`, payload);
      else await api.post('/attributes', payload);
      toast.success(attrEditing?.id ? 'Đã cập nhật thuộc tính' : 'Đã thêm thuộc tính');
      setAttrOpen(false);
      setAttrEditing(null);
      await loadAttrs(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingAttr(false);
    }
  };

  const removeAttr = async () => {
    if (!attrDelete) return;
    try {
      await api.delete(`/attributes/${attrDelete.id}`);
      toast.success('Đã xóa thuộc tính và các giá trị liên quan');
      if (String(attrId) === String(attrDelete.id)) setAttrId('');
      await loadAttrs(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const saveAttrValue = async () => {
    if (!attrId) return toast.warning('Vui chọn thuộc tính trước');
    if (!(valForm.value || '').trim()) return toast.error('Vui nhập giá trị');
    setSavingVal(true);
    try {
      await api.post(`/attributes/${attrId}/values`, attributeValuePayload(valForm));
      toast.success('Đã thêm giá trị');
      setValForm({});
      await loadAttrs(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingVal(false);
    }
  };

  const startValueEdit = (attribute, value) => {
    setValueEditing({ attribute, value });
    setValueForm({
      value: value.value || '',
      display_value: value.display_value || '',
      color_hex: value.color_hex || '',
      image_media_id: value.image_media_id || null,
      sort_order: value.sort_order ?? 0,
    });
  };

  const closeValueDialog = () => {
    if (savingValueEdit) return;
    setValueEditing(null);
    setValueForm({});
  };

  const saveValueEdit = async () => {
    if (!valueEditing?.value?.id) return;
    if (!(valueForm.value || '').trim()) return toast.error('Vui nhập giá trị');
    setSavingValueEdit(true);
    try {
      await api.put(`/attribute-values/${valueEditing.value.id}`, attributeValuePayload(valueForm));
      toast.success('Đã cập nhật giá trị');
      setValueEditing(null);
      setValueForm({});
      await loadAttrs(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingValueEdit(false);
    }
  };

  const removeValue = async () => {
    if (!valueDelete) return;
    try {
      await api.delete(`/attribute-values/${valueDelete.value.id}`);
      toast.success('Đã xóa giá trị');
      await loadAttrs(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const fAttrs = useRowFilter(attrs, attrQ, (r) => `${r.name} ${r.code} ${r.display_type || ''}`);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Danh mục & Thương hiệu</h1>
      <Card>
        <CardContent className="pt-4">
          <Tabs active={tab} onChange={setTab} tabs={[
            { key: 'cat', label: 'Danh mục' },
            { key: 'brand', label: 'Thương hiệu' },
            { key: 'attr', label: 'Thuộc tính' },
          ]} />

          {tab === 'cat' && (
            <Crud
              title="danh mục"
              listUrl="/categories"
              open={catOpen}
              setOpen={setCatOpen}
              editing={catEditing}
              setEditing={setCatEditing}
              form={catForm}
              setForm={setCatForm}
              canWrite={canWriteCategories}
              buildPayload={categoryPayload}
              columns={[
                { key: 'id', title: 'ID' },
                {
                  key: 'image_key',
                  title: 'Ảnh',
                  render: (value, row) => (value
                    ? <img src={mediaUrl(value)} alt="" className="size-10 border border-slate-200 object-cover" loading="lazy" />
                    : row.icon
                      ? <i className={`bi ${row.icon}`} style={{ fontSize: 18, color: '#0f4c81' }}></i>
                      : '—'),
                },
                { key: 'name', title: 'Tên' },
                { key: 'slug', title: 'Đường dẫn' },
                { key: 'parent_id', title: 'Danh mục cha' },
                { key: 'sort_order', title: 'Sắp xếp' },
                { key: 'status', title: 'Trạng thái', render: (value) => <Badge color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? 'Đang hiện' : 'Đang ẩn'}</Badge> },
              ]}
            >
              <div className="grid gap-3">
                <Field label="Tên *">
                  <Input value={catForm.name || ''} onChange={(e) => setCatForm((value) => ({ ...value, name: e.target.value }))} />
                </Field>
                <Field label="Ảnh danh mục (hiện ở trang chủ)">
                  <MediaPicker
                    value={catForm.image_media_id || null}
                    onChange={(id) => setCatForm((value) => ({ ...value, image_media_id: id }))}
                    kind="image"
                  />
                </Field>
                <Field label="Biểu tượng hiển thị ở website (dùng khi danh mục chưa có ảnh)">
                  <div className="flex items-center gap-2">
                    <Select
                      value={catForm.icon || ''}
                      onChange={(e) => setCatForm((value) => ({ ...value, icon: e.target.value || null }))}
                    >
                      <option value="">Không dùng biểu tượng</option>
                      {CAT_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                    </Select>
                    {catForm.icon && <i className={`bi ${catForm.icon}`} style={{ fontSize: 24, color: '#0f4c81' }}></i>}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Danh mục cha (ID)">
                    <Input type="number" value={catForm.parent_id || ''} onChange={(e) => setCatForm((value) => ({ ...value, parent_id: Number(e.target.value) || null }))} />
                  </Field>
                  <Field label="Sắp xếp">
                    <Input type="number" value={catForm.sort_order ?? 0} onChange={(e) => setCatForm((value) => ({ ...value, sort_order: Number(e.target.value) || 0 }))} />
                  </Field>
                </div>
                <Field label="Trạng thái">
                  <Select value={catForm.status || 'active'} onChange={(e) => setCatForm((value) => ({ ...value, status: e.target.value }))}>
                    <option value="active">Đang hiện</option>
                    <option value="inactive">Đang ẩn</option>
                  </Select>
                </Field>
              </div>
            </Crud>
          )}

          {tab === 'brand' && (
            <Crud
              title="thương hiệu"
              listUrl="/brands"
              open={brandOpen}
              setOpen={setBrandOpen}
              editing={brandEditing}
              setEditing={setBrandEditing}
              form={brandForm}
              setForm={setBrandForm}
              canWrite={canWriteProducts}
              buildPayload={brandPayload}
              columns={[
                { key: 'id', title: 'ID' },
                {
                  key: 'logo_key',
                  title: 'Logo',
                  render: (value) => (value
                    ? <img src={mediaUrl(value)} alt="" className="size-10 border border-slate-200 object-contain" loading="lazy" />
                    : '—'),
                },
                { key: 'name', title: 'Tên' },
                { key: 'slug', title: 'Đường dẫn' },
                { key: 'status', title: 'Trạng thái', render: (value) => <Badge color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? 'Đang hiện' : 'Đang ẩn'}</Badge> },
              ]}
            >
              <div className="grid gap-3">
                <Field label="Tên *">
                  <Input value={brandForm.name || ''} onChange={(e) => setBrandForm((value) => ({ ...value, name: e.target.value }))} />
                </Field>
                <Field label="Logo thương hiệu">
                  <MediaPicker
                    value={brandForm.logo_media_id || null}
                    onChange={(id) => setBrandForm((value) => ({ ...value, logo_media_id: id }))}
                    kind="image"
                  />
                </Field>
                <Field label="Mô tả">
                  <Input value={brandForm.description || ''} onChange={(e) => setBrandForm((value) => ({ ...value, description: e.target.value }))} />
                </Field>
                <Field label="Trạng thái">
                  <Select value={brandForm.status || 'active'} onChange={(e) => setBrandForm((value) => ({ ...value, status: e.target.value }))}>
                    <option value="active">Đang hiện</option>
                    <option value="inactive">Đang ẩn</option>
                  </Select>
                </Field>
              </div>
            </Crud>
          )}

          {tab === 'attr' && (
            <>
              {canWriteProducts && <Button onClick={startAttrCreate}><Plus />Thêm thuộc tính</Button>}
              <TableSearch value={attrQ} onChange={setAttrQ} placeholder="Tìm thuộc tính hoặc mã..." className="mt-3" />
              <TableWrap className="mt-3">
                <table className="w-full text-sm">
                  <THead>
                    <Tr>
                      <Th>Tên</Th>
                      <Th>Mã</Th>
                      <Th>Kiểu hiển thị</Th>
                      <Th>Giá trị</Th>
                      <Th className="text-right">Thao tác</Th>
                    </Tr>
                  </THead>
                  <tbody>
                    {fAttrs.map((attribute) => (
                      <Tr key={attribute.id}>
                        <Td className="font-medium">{attribute.name}</Td>
                        <Td><Badge>{attribute.code}</Badge></Td>
                        <Td>{ATTRIBUTE_TYPE_LABELS[attribute.display_type] || 'Văn bản'}</Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-2">
                            {(attribute.values || []).map((value) => (
                              <span key={value.id} className="inline-flex items-center gap-1 rounded-md border border-slate-200">
                                <Badge>{value.display_value || value.value}</Badge>
                                {canWriteProducts && (
                                  <RowActions>
                                    <IconButton label="Sửa giá trị" onClick={() => startValueEdit(attribute, value)}>
                                      <Pencil />
                                    </IconButton>
                                    <IconButton label="Xóa giá trị" onClick={() => setValueDelete({ attribute, value })}>
                                      <Trash2 className="text-red-600" />
                                    </IconButton>
                                  </RowActions>
                                )}
                              </span>
                            ))}
                            {!attribute.values?.length && '—'}
                          </div>
                        </Td>
                        <Td>
                          <RowActions>
                            {canWriteProducts && (
                              <>
                                <IconButton label="Sửa thuộc tính" onClick={() => startAttrEdit(attribute)}>
                                  <Pencil />
                                </IconButton>
                                <IconButton label="Xóa thuộc tính" onClick={() => setAttrDelete(attribute)}>
                                  <Trash2 className="text-red-600" />
                                </IconButton>
                              </>
                            )}
                          </RowActions>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              {!attrs.length && <Empty />}

              {canWriteProducts && (
                <div className="mt-3">
                  <Toolbar>
                    <Select value={attrId} onChange={(e) => setAttrId(e.target.value)}>
                      <option value="">Chọn thuộc tính...</option>
                      {attrs.map((attribute) => <option key={attribute.id} value={attribute.id}>{attribute.name}</option>)}
                    </Select>
                    <Input placeholder="Giá trị (M...)" value={valForm.value || ''} className="max-w-[160px]" onChange={(e) => setValForm((value) => ({ ...value, value: e.target.value }))} />
                    <Input placeholder="Tên hiển thị" value={valForm.display_value || ''} className="max-w-[160px]" onChange={(e) => setValForm((value) => ({ ...value, display_value: e.target.value }))} />
                    <Button disabled={savingVal} onClick={saveAttrValue}>{savingVal ? 'Đang lưu...' : 'Thêm giá trị'}</Button>
                  </Toolbar>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={attrOpen} onOpenChange={(next) => !next && closeAttrDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{attrEditing?.id ? 'Sửa thuộc tính' : 'Thêm thuộc tính'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Tên *">
              <Input value={attrForm.name} onChange={(e) => setAttrForm((value) => ({ ...value, name: e.target.value }))} />
            </Field>
            <Field label="Mã *">
              <Input value={attrForm.code} onChange={(e) => setAttrForm((value) => ({ ...value, code: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kiểu hiển thị">
                <Select value={attrForm.display_type} onChange={(e) => setAttrForm((value) => ({ ...value, display_type: e.target.value }))}>
                  {ATTRIBUTE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </Select>
              </Field>
              <Field label="Sắp xếp">
                <Input type="number" value={attrForm.sort_order ?? 0} onChange={(e) => setAttrForm((value) => ({ ...value, sort_order: Number(e.target.value) || 0 }))} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingAttr} onClick={closeAttrDialog}>Hủy</Button>
            <Button disabled={savingAttr} onClick={saveAttr}>{savingAttr ? 'Đang lưu...' : attrEditing?.id ? 'Lưu thay đổi' : 'Thêm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!valueEditing} onOpenChange={(next) => !next && closeValueDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa giá trị thuộc tính</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Giá trị *">
              <Input value={valueForm.value || ''} onChange={(e) => setValueForm((value) => ({ ...value, value: e.target.value }))} />
            </Field>
            <Field label="Tên hiển thị">
              <Input value={valueForm.display_value || ''} onChange={(e) => setValueForm((value) => ({ ...value, display_value: e.target.value }))} />
            </Field>
            {valueEditing?.attribute.display_type === 'color' && (
              <Field label="Mã màu">
                <Input value={valueForm.color_hex || ''} placeholder="#RRGGBB" onChange={(e) => setValueForm((value) => ({ ...value, color_hex: e.target.value }))} />
              </Field>
            )}
            <Field label="Sắp xếp">
              <Input type="number" value={valueForm.sort_order ?? 0} onChange={(e) => setValueForm((value) => ({ ...value, sort_order: Number(e.target.value) || 0 }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingValueEdit} onClick={closeValueDialog}>Hủy</Button>
            <Button disabled={savingValueEdit} onClick={saveValueEdit}>{savingValueEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!attrDelete}
        onOpenChange={(next) => !next && setAttrDelete(null)}
        title="Xóa thuộc tính"
        description="Xóa vĩnh viễn thuộc tính này cùng toàn bộ giá trị và các lựa chọn biến thể đang được gắn."
        onConfirm={removeAttr}
      />

      <ConfirmDialog
        open={!!valueDelete}
        onOpenChange={(next) => !next && setValueDelete(null)}
        title="Xóa giá trị"
        description={`Xóa vĩnh viễn giá trị “${valueDelete?.value.display_value || valueDelete?.value.value || ''}” và gỡ nó khỏi mọi biến thể sản phẩm đang sử dụng.`}
        onConfirm={removeValue}
      />
    </div>
  );
}
