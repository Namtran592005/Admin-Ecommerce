import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg } from '../api/client';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, Toolbar } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const CAT_ICONS = ['bi-bag', 'bi-basket', 'bi-basket3', 'bi-tag', 'bi-tags', 'bi-gift', 'bi-house', 'bi-phone', 'bi-laptop', 'bi-controller', 'bi-headphones', 'bi-watch', 'bi-camera', 'bi-bicycle', 'bi-book', 'bi-pencil', 'bi-brush', 'bi-gem', 'bi-lamp', 'bi-tools', 'bi-heart-pulse', 'bi-cup-straw', 'bi-egg-fried', 'bi-cart', 'bi-star', 'bi-truck', 'bi-ticket-perforated'];

function Crud({ title, listUrl, createUrl, columns, children, form, onSubmit, open, setOpen }) {
  const [rows, setRows] = useState([]);
  const load = (quiet = false) => api.get(listUrl).then((r) => setRows(Array.isArray(r.data) ? r.data : [])).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
  useEffect(() => { load(); }, []);
  const save = async () => {
    try { await api.post(createUrl, form); toast.success('Đã thêm ' + title); setOpen(false); onSubmit(); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus />Thêm {title}</Button>
      <TableWrap><table className="w-full text-sm">
        <THead><Tr>{columns.map((c) => <Th key={c.key}>{c.title}</Th>)}</Tr></THead>
        <tbody>{rows.map((r) => <Tr key={r.id}>{columns.map((c) => <Td key={c.key}>{c.render ? c.render(r[c.key], r) : r[c.key]}</Td>)}</Tr>)}</tbody>
      </table></TableWrap>
      {!rows.length && <Empty />}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm {title}</DialogTitle></DialogHeader>
          {children}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button onClick={save}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Catalog() {
  const [tab, setTab] = useState('cat');
  const [catOpen, setCatOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [catForm, setCatForm] = useState({});
  const [brandForm, setBrandForm] = useState({});
  const [attrs, setAttrs] = useState([]);
  const [attr, setAttr] = useState({ name: '', code: '' });
  const [attrId, setAttrId] = useState('');
  const [valForm, setValForm] = useState({});

  const loadAttrs = () => api.get('/attributes').then((r) => setAttrs(r.data)).catch(() => {});
  useEffect(() => { loadAttrs(); }, []);

  const saveAttr = async () => {
    if (!attr.name || !attr.code) return toast.error('Nhập tên và mã');
    try { await api.post('/attributes', attr); toast.success('Đã thêm thuộc tính'); setAttr({ name: '', code: '' }); loadAttrs(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const saveAttrValue = async () => {
    if (!attrId) return toast.warning('Chọn thuộc tính trước');
    if (!valForm.value) return toast.error('Nhập giá trị');
    try { await api.post(`/attributes/${attrId}/values`, valForm); toast.success('Đã thêm giá trị'); setValForm({}); loadAttrs(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Danh mục & Thương hiệu</h1>
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'cat', label: 'Danh mục' }, { key: 'brand', label: 'Thương hiệu' }, { key: 'attr', label: 'Thuộc tính' },
        ]} />
        {tab === 'cat' && (
          <Crud title="danh mục" listUrl="/categories" createUrl="/categories" open={catOpen} setOpen={setCatOpen} form={catForm} onSubmit={() => setCatForm({})}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'icon', title: 'Icon', render: (v) => (v ? <i className={`bi ${v}`} style={{ fontSize: 18, color: '#0f4c81' }}></i> : '—') },
              { key: 'name', title: 'Tên' }, { key: 'slug', title: 'Đường dẫn' },
              { key: 'parent_id', title: 'Cha' }, { key: 'sort_order', title: 'Sắp xếp' },
              { key: 'status', title: 'Trạng thái', render: (v) => <Badge color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? 'Đang hiện' : 'Đã ẩn'}</Badge> },
            ]}>
            <div className="grid gap-3">
              <Field label="Tên *"><Input value={catForm.name || ''} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></Field>
              <Field label="Icon hiển thị ở web">
                <div className="flex items-center gap-2">
                  <select value={catForm.icon || ''} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value || null })}
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm">
                    <option value="">Không dùng icon</option>
                    {CAT_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  {catForm.icon && <i className={`bi ${catForm.icon}`} style={{ fontSize: 24, color: '#0f4c81' }}></i>}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Danh mục cha (ID)"><Input type="number" value={catForm.parent_id || ''} onChange={(e) => setCatForm({ ...catForm, parent_id: Number(e.target.value) || null })} /></Field>
                <Field label="Sắp xếp"><Input type="number" value={catForm.sort_order || ''} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) || 0 })} /></Field>
              </div>
            </div>
          </Crud>
        )}
        {tab === 'brand' && (
          <Crud title="thương hiệu" listUrl="/brands" createUrl="/brands" open={brandOpen} setOpen={setBrandOpen} form={brandForm} onSubmit={() => setBrandForm({})}
            columns={[
              { key: 'id', title: 'ID' }, { key: 'name', title: 'Tên' }, { key: 'slug', title: 'Đường dẫn' },
              { key: 'status', title: 'Trạng thái', render: (v) => <Badge color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? 'Hoạt động' : 'Ngừng'}</Badge> },
            ]}>
            <div className="grid gap-3">
              <Field label="Tên *"><Input value={brandForm.name || ''} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} /></Field>
              <Field label="Mô tả"><Input value={brandForm.description || ''} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} /></Field>
            </div>
          </Crud>
        )}
        {tab === 'attr' && (<>
          <Toolbar>
            <Input placeholder="Tên thuộc tính (Màu sắc...)" value={attr.name} className="max-w-[200px]" onChange={(e) => setAttr({ ...attr, name: e.target.value })} />
            <Input placeholder="Mã (color...)" value={attr.code} className="max-w-[160px]" onChange={(e) => setAttr({ ...attr, code: e.target.value })} />
            <Button onClick={saveAttr}><Plus />Thêm thuộc tính</Button>
          </Toolbar>
          {attrs.map((a) => (
            <div key={a.id} className="mb-2 rounded-lg border px-3 py-2 text-sm">
              <b>{a.name}</b> <Badge>{a.code}</Badge>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(a.values || []).map((v) => <Badge key={v.id}>{v.display_value || v.value}</Badge>)}
              </div>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={attrId} onChange={(e) => setAttrId(e.target.value)}
              className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="">Chọn thuộc tính...</option>
              {attrs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Input placeholder="Giá trị (M...)" value={valForm.value || ''} className="max-w-[160px]" onChange={(e) => setValForm({ ...valForm, value: e.target.value })} />
            <Input placeholder="Tên hiển thị" value={valForm.display_value || ''} className="max-w-[160px]" onChange={(e) => setValForm({ ...valForm, display_value: e.target.value })} />
            <Button variant="outline" onClick={saveAttrValue}>Thêm giá trị</Button>
          </div>
        </>)}
      </CardContent></Card>
    </div>
  );
}
