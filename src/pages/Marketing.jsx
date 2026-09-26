import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Select, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs, ConfirmDialog, IconButton, RowActions } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { MediaPicker, mediaUrl } from '../components/pickers';

const CAMP_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'ended'];
const BANNER_STATUSES = ['draft', 'active', 'inactive'];
const EMPTY_CAMP = { name: '', description: '', status: 'draft' };
const EMPTY_BANNER = { title: '', link_url: '', alt_text: '', sort_order: 0, status: 'active' };

const isVideoMime = (m) => (m?.mime_type || '').startsWith('video/');

function Thumb({ src, alt, mime }) {
  if (!src) {
    return <span className="grid h-11 w-20 place-items-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400">Chưa có media</span>;
  }
  if (isVideoMime({ mime_type: mime })) {
    return (
      <span className="relative block h-11 w-20 overflow-hidden rounded border border-slate-200 bg-slate-900">
        <video src={src} muted playsInline preload="metadata" className="size-full object-cover" />
        <span className="absolute bottom-0 left-0 rounded-tr bg-slate-900/80 px-1 py-px text-[9px] font-semibold text-white">VIDEO</span>
      </span>
    );
  }
  return <img src={src} alt={alt || ''} className="h-11 w-20 rounded border border-slate-200 bg-white object-contain" />;
}

function EmailComposer() {
  const [mode, setMode] = useState('manual');
  const [emails, setEmails] = useState('');
  const [allEmails, setAllEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<h3>Xin chào quý khách!</h3><p>Nội dung khuyến mãi...</p>');
  const [view, setView] = useState('edit');
  const [sending, setSending] = useState(false);
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    api.get('/email/config').then((r) => setCfg(r.data)).catch(() => setCfg({ configured: false }));
  }, []);

  const loadAll = async () => {
    try {
      const { data } = await api.get('/users', { params: { page: 1, limit: 200 } });
      const list = [...new Set((data.data || []).map((u) => u.email).filter((e) => e && e.includes('@')))];
      setAllEmails(list);
      toast.success(`Đã lấy ${list.length} email khách`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const parseManual = () => [...new Set(emails.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => s.includes('@')))];
  const targets = mode === 'manual' ? parseManual() : allEmails;

  const sendTest = async () => {
    const to = mode === 'manual' ? parseManual()[0] : allEmails[0];
    if (!to) return toast.warning('Chưa có email nhận');
    try { await api.post('/email/test', { to }); toast.success('Đã gửi mail thử tới ' + to); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const send = async () => {
    if (!targets.length) return toast.warning('Chưa có người nhận');
    if (!subject.trim() || !html.trim()) return toast.warning('Nhập tiêu đề và nội dung');
    setSending(true);
    try {
      const { data } = await api.post('/email/send', { to: targets, subject: subject.trim(), html });
      if (data.failed?.length) toast.warning(`Đã gửi ${data.sent}, lỗi ${data.failed.length}`);
      else toast.success(`Đã gửi ${data.sent} email`);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSending(false); }
  };

  return (
    <>
      {!cfg?.configured && <p className="mb-3"><Badge color="red">Chưa cấu hình SMTP — liên hệ kỹ thuật (SMTP_HOST/USER/PASS)</Badge></p>}
      <div className="mb-3 flex gap-2">
        {[{ v: 'manual', l: 'Nhập tay' }, { v: 'all', l: 'Tất cả khách có email' }].map((m) => (
          <button key={m.v} onClick={() => setMode(m.v)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${mode === m.v ? 'border-brand-500 bg-blue-50 font-medium text-brand-600' : 'border-slate-200'}`}>
            {m.l}
          </button>
        ))}
      </div>
      {mode === 'manual'
        ? <textarea className="mb-3 flex min-h-[70px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="a@gmail.com, b@gmail.com..." value={emails} onChange={(e) => setEmails(e.target.value)} />
        : <div className="mb-3"><Button variant="outline" onClick={loadAll}>Tải danh sách ({allEmails.length || '?'})</Button></div>}
      <Input placeholder="Tiêu đề email *" value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-3" />
      <Tabs active={view} onChange={setView} tabs={[{ key: 'edit', label: 'Soạn HTML' }, { key: 'view', label: 'Xem trước' }]} />
      {view === 'edit'
        ? <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={10} className="w-full rounded-lg border border-slate-200 p-3 font-mono text-sm" />
        : <div className="min-h-[200px] rounded-lg border p-4"><div dangerouslySetInnerHTML={{ __html: html }} /></div>}
      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={sendTest} disabled={sending}>Gửi thử</Button>
        <Button onClick={send} disabled={sending}><Send />{sending ? 'Đang gửi...' : `Gửi${targets.length ? ` (${targets.length})` : ''}`}</Button>
      </div>
    </>
  );
}

export default function Marketing() {
  const { can } = useAuth();
  const writable = can('promotions.write');
  const [tab, setTab] = useState('c');
  const [camps, setCamps] = useState([]);
  const [banners, setBanners] = useState([]);

  const [campOpen, setCampOpen] = useState(false);
  const [campEditId, setCampEditId] = useState(null);
  const [camp, setCamp] = useState(EMPTY_CAMP);
  const [campSaving, setCampSaving] = useState(false);

  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerEditId, setBannerEditId] = useState(null);
  const [banner, setBanner] = useState(EMPTY_BANNER);
  const [bannerMedia, setBannerMedia] = useState(null);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = (quiet = false) => {
    api.get('/campaigns', { params: { all: 1 } }).then((r) => setCamps(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/banners/all').then((r) => setBanners(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
  };
  useEffect(() => { load(); }, []);

  const openCreateCamp = () => { setCampEditId(null); setCamp(EMPTY_CAMP); setCampOpen(true); };
  const openEditCamp = (row) => {
    setCampEditId(row.id);
    setCamp({ name: row.name || '', description: row.description || '', status: row.status || 'draft' });
    setCampOpen(true);
  };
  const saveCamp = async () => {
    if (!camp.name.trim()) return toast.error('Nhập tên chiến dịch');
    setCampSaving(true);
    try {
      if (campEditId) {
        await api.put(`/campaigns/${campEditId}`, { ...camp, name: camp.name.trim() });
        toast.success('Đã cập nhật chiến dịch');
      } else {
        await api.post('/campaigns', { ...camp, name: camp.name.trim() });
        toast.success('Đã tạo chiến dịch');
      }
      setCampOpen(false);
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setCampSaving(false); }
  };

  const openCreateBanner = () => {
    setBannerEditId(null);
    setBanner(EMPTY_BANNER);
    setBannerMedia(null);
    setBannerOpen(true);
  };
  const openEditBanner = (row) => {
    setBannerEditId(row.id);
    setBanner({
      title: row.title || '',
      link_url: row.link_url || '',
      alt_text: row.alt_text || '',
      sort_order: row.sort_order ?? 0,
      status: row.status || 'draft',
    });
    setBannerMedia(row.image_media_id || null);
    setBannerOpen(true);
  };
  const saveBanner = async () => {
    if (!banner.title.trim()) return toast.error('Nhập tiêu đề banner');
    if (!bannerMedia) return toast.warning('Chọn ảnh hoặc video banner');
    setBannerSaving(true);
    const payload = {
      title: banner.title.trim(),
      link_url: banner.link_url.trim() || null,
      alt_text: banner.alt_text.trim() || null,
      sort_order: Number(banner.sort_order) || 0,
      status: banner.status,
      image_media_id: bannerMedia,
    };
    try {
      if (bannerEditId) {
        await api.put(`/banners/${bannerEditId}`, payload);
        toast.success('Đã cập nhật banner');
      } else {
        await api.post('/banners', payload);
        toast.success('Đã tạo banner');
      }
      setBannerOpen(false);
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBannerSaving(false); }
  };

  const toggleStatus = async (kind, row) => {
    const next = row.status === 'active' ? 'inactive' : 'active';
    const path = kind === 'banner' ? `/banners/${row.id}` : `/campaigns/${row.id}`;
    try {
      await api.put(path, { status: next });
      toast.success(next === 'active' ? 'Đã kích hoạt' : 'Đã ẩn');
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const moveBanner = async (index, dir) => {
    const next = [...banners];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBanners(next);
    try {
      await api.post('/banners/reorder', { ids: next.map((b) => b.id) });
      toast.success('Đã đổi thứ tự hiển thị');
    } catch (e) { toast.error(errMsg(e)); load(true); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const { kind, row } = deleteTarget;
    try {
      if (kind === 'banner') await api.delete(`/banners/${row.id}`);
      else await api.delete(`/campaigns/${row.id}`);
      toast.success('Đã xóa');
      setDeleteTarget(null);
      load(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setDeleteBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Marketing" actions={writable && (
        tab === 'c' ? <Button onClick={openCreateCamp}><Plus />Tạo chiến dịch</Button>
        : tab === 'b' ? <Button onClick={openCreateBanner}><Plus />Tạo banner</Button> : null
      )} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'c', label: 'Chiến dịch' }, { key: 'b', label: 'Banner' }, { key: 'e', label: 'Gửi email' },
        ]} />
        {tab === 'c' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Tên</Th><Th>Mô tả</Th><Th>Trạng thái</Th><Th>Ngày tạo</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{camps.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium">{c.name}</Td>
                <Td className="max-w-[280px] truncate text-slate-500">{c.description || '—'}</Td>
                <Td><Badge color={c.status === 'active' ? 'green' : c.status === 'paused' ? 'amber' : 'default'}>{t('promo', c.status)}</Badge></Td>
                <Td className="text-slate-500">{fmtDate(c.created_at)}</Td>
                <Td><RowActions>
                  {writable && (<>
                    <IconButton label={c.status === 'active' ? 'Ẩn chiến dịch' : 'Kích hoạt'} onClick={() => toggleStatus('camp', c)}>
                      {c.status === 'active' ? <EyeOff /> : <Eye />}
                    </IconButton>
                    <IconButton label="Sửa chiến dịch" onClick={() => openEditCamp(c)}><Pencil /></IconButton>
                    <IconButton label="Xóa chiến dịch" onClick={() => setDeleteTarget({ kind: 'camp', row: c })}>
                      <Trash2 className="text-red-600" />
                    </IconButton>
                  </>)}
                </RowActions></Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!camps.length && <Empty />}
        </>)}
        {tab === 'b' && (<>
          <p className="mb-2 text-xs text-slate-500">
            Thứ tự trên bảng là thứ tự hiển thị trên trang chủ. Mỗi banner dùng chung một media cho mọi màn hình — chọn ảnh 16:9, hoặc video mp4/webm sẽ tự chạy không tiếng.
          </p>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr>
              <Th className="w-10">#</Th><Th>Media</Th><Th>Tiêu đề</Th><Th>Liên kết</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th>
            </Tr></THead>
            <tbody>{banners.map((b, i) => (
              <Tr key={b.id}>
                <Td className="text-slate-400">{i + 1}</Td>
                <Td>
                  <Thumb src={b.image_key ? mediaUrl(b.image_key) : null} alt={b.alt_text} mime={b.mime_type} />
                </Td>
                <Td>
                  <div className="font-medium">{b.title}</div>
                  {b.alt_text && <div className="truncate text-xs text-slate-400">{b.alt_text}</div>}
                </Td>
                <Td className="max-w-[160px] truncate text-slate-500">{b.link_url || '—'}</Td>
                <Td><Badge color={b.status === 'active' ? 'green' : 'default'}>{t('coupon', b.status)}</Badge></Td>
                <Td><RowActions>
                  {writable && (<>
                    <IconButton label="Lên" onClick={() => moveBanner(i, -1)} disabled={i === 0}><ArrowUp /></IconButton>
                    <IconButton label="Xuống" onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1}><ArrowDown /></IconButton>
                    <IconButton label={b.status === 'active' ? 'Ẩn banner' : 'Kích hoạt'} onClick={() => toggleStatus('banner', b)}>
                      {b.status === 'active' ? <EyeOff /> : <Eye />}
                    </IconButton>
                    <IconButton label="Sửa banner" onClick={() => openEditBanner(b)}><Pencil /></IconButton>
                    <IconButton label="Xóa banner" onClick={() => setDeleteTarget({ kind: 'banner', row: b })}>
                      <Trash2 className="text-red-600" />
                    </IconButton>
                  </>)}
                </RowActions></Td>
              </Tr>
            ))}</tbody>
          </table></TableWrap>
          {!banners.length && <Empty />}
        </>)}
        {tab === 'e' && <EmailComposer />}
      </CardContent></Card>

      <Dialog open={campOpen} onOpenChange={(openState) => !campSaving && setCampOpen(openState)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{campEditId ? 'Sửa chiến dịch' : 'Tạo chiến dịch'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Tên *" className="sm:col-span-3">
              <Input value={camp.name} onChange={(e) => setCamp({ ...camp, name: e.target.value })} placeholder="Ví dụ: Sale hè 2026" />
            </Field>
            <Field label="Trạng thái" className="sm:col-span-2">
              <Select value={camp.status} onChange={(e) => setCamp({ ...camp, status: e.target.value })}>
                {opts('promo', CAMP_STATUSES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Mô tả" className="sm:col-span-5">
              <Input value={camp.description} onChange={(e) => setCamp({ ...camp, description: e.target.value })} placeholder="Mô tả ngắn cho đội marketing" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={campSaving} onClick={() => setCampOpen(false)}>Hủy</Button>
            <Button disabled={campSaving} onClick={saveCamp}>{campSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bannerOpen} onOpenChange={(openState) => !bannerSaving && setBannerOpen(openState)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{bannerEditId ? 'Sửa banner' : 'Tạo banner'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tiêu đề *" className="sm:col-span-2">
              <Input value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} />
            </Field>
            <Field label="Ảnh hoặc video *" hint="Dùng chung mọi màn hình. Video mp4/webm tự chạy không tiếng, không có nút điều khiển" className="sm:col-span-2">
              <MediaPicker value={bannerMedia} onChange={setBannerMedia} kind="banner" />
            </Field>
            <Field label="Liên kết" hint="Ví dụ: /khuyen-mai">
              <Input value={banner.link_url} onChange={(e) => setBanner({ ...banner, link_url: e.target.value })} />
            </Field>
            <Field label="Thứ tự" hint="Số nhỏ hiển thị trước">
              <Input type="number" min={0} value={banner.sort_order} onChange={(e) => setBanner({ ...banner, sort_order: e.target.value })} />
            </Field>
            <Field label="Chữ thay thế (alt)" hint="Tốt cho SEO và trình đọc màn hình">
              <Input value={banner.alt_text} onChange={(e) => setBanner({ ...banner, alt_text: e.target.value })} />
            </Field>
            <Field label="Trạng thái">
              <Select value={banner.status} onChange={(e) => setBanner({ ...banner, status: e.target.value })}>
                {opts('coupon', BANNER_STATUSES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={bannerSaving} onClick={() => setBannerOpen(false)}>Hủy</Button>
            <Button disabled={bannerSaving || !bannerMedia} onClick={saveBanner}>
              {bannerSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(openState) => !openState && setDeleteTarget(null)}
        title={deleteTarget?.kind === 'banner' ? 'Xóa banner?' : 'Xóa chiến dịch?'}
        description={`“${deleteTarget?.row?.name || deleteTarget?.row?.title || ''}” sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa"
        busy={deleteBusy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
