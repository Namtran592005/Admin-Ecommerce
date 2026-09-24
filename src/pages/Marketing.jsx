import { useEffect, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t, opts } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { MediaPicker } from '../components/pickers';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';

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
        <Button variant="outline" onClick={sendTest}>Gửi thử</Button>
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
  const [cOpen, setCOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [bannerMedia, setBannerMedia] = useState(null);
  const [camp, setCamp] = useState({ status: 'draft' });
  const [banner, setBanner] = useState({ status: 'active' });

  const load = (quiet = false) => {
    api.get('/campaigns').then((r) => setCamps(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/banners/all').then((r) => setBanners(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const saveCamp = async () => {
    if (!camp.name) return toast.error('Nhập tên');
    try { await api.post('/campaigns', camp); toast.success('Đã tạo chiến dịch'); setCOpen(false); setCamp({ status: 'draft' }); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const saveBanner = async () => {
    if (!banner.title) return toast.error('Nhập tiêu đề');
    if (!bannerMedia) return toast.warning('Chọn ảnh banner');
    try { await api.post('/banners', { ...banner, image_media_id: bannerMedia }); toast.success('Đã tạo banner'); setBOpen(false); setBanner({ status: 'active' }); setBannerMedia(null); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Marketing" actions={writable && (
        tab === 'c' ? <Button onClick={() => setCOpen(true)}><Plus />Tạo chiến dịch</Button>
        : tab === 'b' ? <Button onClick={() => setBOpen(true)}><Plus />Tạo banner</Button> : null
      )} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'c', label: 'Chiến dịch' }, { key: 'b', label: 'Banner' }, { key: 'e', label: 'Gửi email' },
        ]} />
        {tab === 'c' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Tên</Th><Th>Mô tả</Th><Th>Trạng thái</Th></Tr></THead>
            <tbody>{camps.map((c) => <Tr key={c.id}><Td>{c.name}</Td><Td>{c.description}</Td>
              <Td><Badge>{t('promo', c.status)}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
          {!camps.length && <Empty />}
        </>)}
        {tab === 'b' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Tiêu đề</Th><Th>Liên kết</Th><Th>Ảnh</Th><Th>Sắp xếp</Th><Th>Trạng thái</Th></Tr></THead>
            <tbody>{banners.map((b) => <Tr key={b.id}><Td>{b.title}</Td><Td>{b.link_url}</Td><Td>{b.image_media_id ? `#${b.image_media_id}` : '—'}</Td>
              <Td>{b.sort_order}</Td>
              <Td><Badge color={b.status === 'active' ? 'green' : 'default'}>{t('coupon', b.status)}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
          {!banners.length && <Empty />}
        </>)}
        {tab === 'e' && <EmailComposer />}
      </CardContent></Card>

      <Dialog open={cOpen} onOpenChange={setCOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo chiến dịch</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Tên *" className="sm:col-span-3"><Input value={camp.name || ''} onChange={(e) => setCamp({ ...camp, name: e.target.value })} /></Field>
            <Field label="Trạng thái" className="sm:col-span-2">
              <select className={inputCls} value={camp.status} onChange={(e) => setCamp({ ...camp, status: e.target.value })}>
                {opts('promo', ['draft', 'scheduled', 'active', 'paused', 'ended']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Mô tả" className="sm:col-span-5"><Input value={camp.description || ''} onChange={(e) => setCamp({ ...camp, description: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCOpen(false)}>Hủy</Button>
            <Button onClick={saveCamp}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bOpen} onOpenChange={setBOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Tạo banner</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tiêu đề *"><Input value={banner.title || ''} onChange={(e) => setBanner({ ...banner, title: e.target.value })} /></Field>
            <Field label="Sắp xếp"><Input type="number" min={0} value={banner.sort_order ?? ''} onChange={(e) => setBanner({ ...banner, sort_order: Number(e.target.value) })} /></Field>
            <Field label="Ảnh *" className="sm:col-span-2"><MediaPicker value={bannerMedia} onChange={setBannerMedia} kind="image" /></Field>
            <Field label="Liên kết"><Input value={banner.link_url || ''} onChange={(e) => setBanner({ ...banner, link_url: e.target.value })} /></Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={banner.status} onChange={(e) => setBanner({ ...banner, status: e.target.value })}>
                {opts('coupon', ['draft', 'active', 'inactive']).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBOpen(false)}>Hủy</Button>
            <Button onClick={saveBanner}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
