import { useEffect, useState } from 'react';
import { Upload, Trash2, Link2, Download, FileText, LayoutGrid, List, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Toolbar, Empty } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import Lightbox from '../components/Lightbox';
import { mediaUrl } from '../components/pickers';
import { cn } from '../lib/utils';

const kindOf = (mime = '') => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
};
const fmtSize = (v) => (!v ? '' : v > 1048576 ? (v / 1048576).toFixed(1) + ' MB' : (v / 1024).toFixed(0) + ' KB');

function Thumb({ m }) {
  const k = kindOf(m.mime_type);
  if (k === 'image') return <img src={mediaUrl(m.object_key)} alt="" className="h-full w-full object-cover" loading="lazy" />;
  if (k === 'video') return <video src={mediaUrl(m.object_key)} className="h-full w-full bg-black object-cover" preload="metadata" />;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 bg-slate-50">
      <FileText className="size-8 text-slate-400" />
      <span className="text-[11px] font-medium">{(m.original_name || '').split('.').pop()?.toUpperCase()}</span>
    </div>
  );
}

export default function Media() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  const load = (quiet = false) => {
    api.get('/media').then((r) => { setRows(r.data); setSelected((s) => s.filter((id) => r.data.some((m) => m.id === id))); })
      .catch((e) => { if (!quiet) toast.error(errMsg(e)); });
  };
  useEffect(() => { load(); }, []);

  const upload = async (file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/media/upload', fd);
      toast.success('Đã tải lên');
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/media/${id}`); toast.success('Đã xóa'); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const removeSelected = async () => {
    if (!selected.length) return;
    let ok = 0, blocked = 0;
    for (const id of selected) {
      try { await api.delete(`/media/${id}`); ok++; }
      catch (e) {
        if (String(e?.response?.status) === '409') blocked++;
        else toast.error(`#${id}: ` + errMsg(e));
      }
    }
    setSelected([]);
    load(true);
    if (ok) toast.success(`Đã xóa ${ok} file`);
    if (blocked) toast.warning(`${blocked} file đang dùng nên giữ lại`);
  };

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const copyUrl = async (key) => {
    try { await navigator.clipboard.writeText(mediaUrl(key)); toast.success('Đã chép liên kết'); }
    catch { toast.error('Không chép được'); }
  };

  const filtered = rows.filter((m) =>
    (tab === 'all' || kindOf(m.mime_type) === tab) &&
    (!q || (m.original_name || '').toLowerCase().includes(q.toLowerCase())));
  const count = (k) => (k === 'all' ? rows.length : rows.filter((m) => kindOf(m.mime_type) === k).length);
  const lbItems = filtered.filter((m) => kindOf(m.mime_type) !== 'file')
    .map((m) => ({ src: mediaUrl(m.object_key), caption: `#${m.id} ${m.original_name || ''}` }));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Thư viện</h1>
      <Card><CardContent className="pt-4">
        <Toolbar>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-600">
            <Upload className="size-4" />Tải lên
            <input type="file" className="hidden" accept="image/*,video/*,.pdf,.zip,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value = ''; }} />
          </label>
          <Input placeholder="Tìm theo tên file..." value={q} className="max-w-[240px]" onChange={(e) => setQ(e.target.value)} />
          <div className="flex overflow-hidden rounded-lg border">
            <button onClick={() => setView('grid')} aria-label="Dạng lưới"
              className={cn('p-2', view === 'grid' ? 'bg-slate-100' : 'text-slate-400')}><LayoutGrid className="size-4" /></button>
            <button onClick={() => setView('list')} aria-label="Dạng danh sách"
              className={cn('p-2', view === 'list' ? 'bg-slate-100' : 'text-slate-400')}><List className="size-4" /></button>
          </div>
          <span className="text-xs text-slate-500">Ảnh ≤ 10MB · video ≤ 100MB · tệp ≤ 20MB</span>
        </Toolbar>
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'all', label: `Tất cả (${count('all')})` },
          { key: 'image', label: `Ảnh (${count('image')})` },
          { key: 'video', label: `Video (${count('video')})` },
          { key: 'file', label: `Tệp (${count('file')})` },
        ]} />
        {selected.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
            <b>Đã chọn {selected.length}</b>
            <Button size="sm" variant="destructive" onClick={removeSelected}><Trash2 />Xóa đã chọn</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Bỏ chọn</Button>
          </div>
        )}
        {filtered.length ? (view === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((m) => (
              <div key={m.id} className={cn('overflow-hidden rounded-xl border bg-white', selected.includes(m.id) && 'border-brand-500 ring-1 ring-brand-500')}>
                <button className="relative block h-28 w-full" onClick={() => {
                  if (kindOf(m.mime_type) === 'file') window.open(mediaUrl(m.object_key), '_blank');
                  else {
                    const idx = lbItems.findIndex((x) => x.src === mediaUrl(m.object_key));
                    setLightbox(idx);
                  }
                }}>
                  <Thumb m={m} />
                  {selected.includes(m.id) && (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">
                      <Check className="size-3.5" />
                    </span>
                  )}
                </button>
                <div className="p-2">
                  <div className="truncate text-xs" title={m.original_name}>#{m.id} · {m.original_name}</div>
                  <div className="text-[11px] text-slate-400">{fmtSize(m.size_bytes)} · {fmtDate(m.created_at)}</div>
                  <div className="mt-1.5 flex gap-1">
                    <Button size="sm" variant={selected.includes(m.id) ? 'default' : 'outline'} onClick={() => toggle(m.id)}>
                      {selected.includes(m.id) ? 'Đã chọn' : 'Chọn'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyUrl(m.object_key)}>Chép liên kết</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="text-red-600" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length}
                    onChange={(e) => setSelected(e.target.checked ? filtered.map((m) => m.id) : [])} aria-label="Chọn tất cả" /></th>
                  <th className="px-3 py-2.5">Xem trước</th><th className="px-3 py-2.5">Tên</th>
                  <th className="px-3 py-2.5">Loại</th><th className="px-3 py-2.5">Dung lượng</th><th className="px-3 py-2.5">Ngày tải</th><th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} aria-label={`Chọn #${m.id}`} /></td>
                    <td className="px-3 py-2"><span className="block h-11 w-16 overflow-hidden rounded-md bg-slate-100"><Thumb m={m} /></span></td>
                    <td className="px-3 py-2">#{m.id} · {m.original_name}</td>
                    <td className="px-3 py-2">{m.mime_type}</td>
                    <td className="px-3 py-2">{fmtSize(m.size_bytes)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(m.created_at)}</td>
                    <td className="px-3 py-2"><div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => copyUrl(m.object_key)}>Chép liên kết</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="text-red-600" /></Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )) : <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu</p>}
      </CardContent></Card>
      <Lightbox items={lbItems} index={lightbox} onClose={() => setLightbox(null)} onNav={setLightbox} />
    </div>
  );
}
