import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api, errMsg } from '../api/client';
import { Button } from '../components/ui/button';
import { Input, Textarea, Field } from '../components/ui/input';
import { Tabs } from '../components/ui/misc';

const KEYS = {
  about: 'page.about',
  stores: 'page.stores',
  faq: 'page.faq',
  sales: 'page.policy.sales',
  shipping: 'page.policy.shipping',
  returns: 'page.policy.returns',
  security: 'page.policy.security',
};

const EMPTY = {
  about: { heading: '', intro: '', body: '' },
  stores: [],
  faq: [],
  sales: { heading: '', intro: '', sections: [] },
  shipping: { heading: '', intro: '', sections: [] },
  returns: { heading: '', intro: '', sections: [] },
  security: { heading: '', intro: '', sections: [] },
};

const POLICIES = ['sales', 'shipping', 'returns', 'security'];
const POLICY_SHORT = {
  sales: 'Bán hàng',
  shipping: 'Giao hàng',
  returns: 'Đổi trả',
  security: 'Bảo mật',
};

function parse(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export default function PageContent() {
  const [tab, setTab] = useState('about');
  const [data, setData] = useState(EMPTY);
  const [saving, setSaving] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data: rows }) => {
      const byKey = Object.fromEntries((rows || []).map((r) => [r.setting_key, r.setting_value]));
      setData({
        about: { ...EMPTY.about, ...(parse(byKey[KEYS.about], EMPTY.about) || {}) },
        stores: parse(byKey[KEYS.stores], EMPTY.stores) || [],
        faq: parse(byKey[KEYS.faq], EMPTY.faq) || [],
        ...Object.fromEntries(POLICIES.map((k) => [k, {
          heading: '', intro: '', sections: [],
          ...(parse(byKey[KEYS[k]], EMPTY[k]) || {}),
        }])),
      });
      setLoaded(true);
    }).catch((e) => { toast.error(errMsg(e)); setLoaded(true); });
  }, []);

  const setAt = (path, value) => setData((d) => ({ ...d, [path]: value }));
  const setList = (path, i, patch) => setData((d) => ({
    ...d, [path]: d[path].map((x, j) => (j === i ? { ...x, ...patch } : x)),
  }));
  const move = (path, i, dir) => setData((d) => {
    const arr = [...d[path]];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...d, [path]: arr };
  });
  const drop = (path, i) => setData((d) => ({ ...d, [path]: d[path].filter((_, j) => j !== i) }));

  const save = async (key) => {
    setSaving(key);
    try {
      const value = key === 'stores' || key === 'faq' ? data[key] : data[key];
      const { data: res } = await api.put(`/settings/${KEYS[key]}`, { value });
      if (res?.value) setAt(key, res.value);
      toast.success('Đã lưu nội dung');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving('');
    }
  };

  const SaveBar = ({ k }) => (
    <div className="mt-3 flex items-center gap-2">
      <Button disabled={saving === k || !loaded} onClick={() => save(k)}>
        {saving === k ? 'Đang lưu...' : 'Lưu nội dung'}
      </Button>
      <span className="text-xs text-slate-500">Hiển thị ngay trên web bán hàng.</span>
    </div>
  );

  const cur = data[tab];
  const isList = tab === 'stores' || tab === 'faq';

  const listEditors = useMemo(() => {
    if (tab === 'stores') {
      return data.stores.map((s, i) => (
        <div key={i} className="mb-3 rounded-lg border border-slate-200 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên cửa hàng">
              <Input value={s.name || ''} onChange={(e) => setList('stores', i, { name: e.target.value })} />
            </Field>
            <Field label="Số điện thoại">
              <Input value={s.phone || ''} onChange={(e) => setList('stores', i, { phone: e.target.value })} />
            </Field>
            <Field label="Địa chỉ" className="sm:col-span-2">
              <Input value={s.address || ''} onChange={(e) => setList('stores', i, { address: e.target.value })} />
            </Field>
            <Field label="Giờ mở cửa" className="sm:col-span-2">
              <Input value={s.hours || ''} onChange={(e) => setList('stores', i, { hours: e.target.value })} />
            </Field>
          </div>
          <RowOps onUp={() => move('stores', i, -1)} onDown={() => move('stores', i, 1)} onDel={() => drop('stores', i)} />
        </div>
      ));
    }
    if (tab === 'faq') {
      return data.faq.map((f, i) => (
        <div key={i} className="mb-3 rounded-lg border border-slate-200 p-3">
          <Field label={`Câu hỏi ${i + 1}`}>
            <Input value={f.q || ''} onChange={(e) => setList('faq', i, { q: e.target.value })} />
          </Field>
          <Field label="Trả lời" className="mt-2">
            <Textarea rows={4} value={f.a || ''} onChange={(e) => setList('faq', i, { a: e.target.value })} />
          </Field>
          <RowOps onUp={() => move('faq', i, -1)} onDown={() => move('faq', i, 1)} onDel={() => drop('faq', i)} />
        </div>
      ));
    }
    return null;
  }, [tab, data]);

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Nội dung hiển thị trên các trang tĩnh của web bán hàng. Sửa xong bấm “Lưu nội dung” để áp dụng.
      </p>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'about', label: 'Giới thiệu' },
        { key: 'stores', label: 'Cửa hàng' },
        { key: 'faq', label: 'Câu hỏi' },
        ...POLICIES.map((k) => ({ key: k, label: POLICY_SHORT[k] })),
      ]} />

      {tab === 'about' && (
        <div className="grid gap-3">
          <Field label="Tiêu đề">
            <Input value={cur.heading} onChange={(e) => setAt('about', { ...cur, heading: e.target.value })} />
          </Field>
          <Field label="Đoạn giới thiệu ngắn" hint="Hiện ngay dưới tiêu đề">
            <Textarea rows={3} value={cur.intro} onChange={(e) => setAt('about', { ...cur, intro: e.target.value })} />
          </Field>
          <Field label="Nội dung chi tiết">
            <Textarea rows={8} value={cur.body} onChange={(e) => setAt('about', { ...cur, body: e.target.value })} />
          </Field>
          <SaveBar k="about" />
        </div>
      )}

      {tab === 'stores' && (
        <div>
          {listEditors}
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setAt('stores', [...data.stores, { name: '', address: '', phone: '', hours: '' }])}>
              Thêm cửa hàng
            </Button>
          </div>
          <SaveBar k="stores" />
        </div>
      )}

      {tab === 'faq' && (
        <div>
          {listEditors}
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setAt('faq', [...data.faq, { q: '', a: '' }])}>
              Thêm câu hỏi
            </Button>
          </div>
          <SaveBar k="faq" />
        </div>
      )}

      {POLICIES.includes(tab) && (
        <div>
          <div className="grid gap-3">
            <Field label="Tiêu đề">
              <Input value={cur.heading} onChange={(e) => setAt(tab, { ...cur, heading: e.target.value })} />
            </Field>
            <Field label="Đoạn mở đầu">
              <Textarea rows={3} value={cur.intro} onChange={(e) => setAt(tab, { ...cur, intro: e.target.value })} />
            </Field>
          </div>
          <p className="mt-4 mb-2 text-sm font-medium text-slate-700">Các mục nội dung</p>
          {cur.sections.map((s, i) => (
            <div key={i} className="mb-3 rounded-lg border border-slate-200 p-3">
              <Field label={`Mục ${i + 1}`}>
                <Input value={s.h || ''} onChange={(e) => setAt(tab, { ...cur, sections: cur.sections.map((x, j) => (j === i ? { ...x, h: e.target.value } : x)) })} />
              </Field>
              <Field label="Nội dung" className="mt-2">
                <Textarea rows={4} value={s.p || ''} onChange={(e) => setAt(tab, { ...cur, sections: cur.sections.map((x, j) => (j === i ? { ...x, p: e.target.value } : x)) })} />
              </Field>
              <RowOps
                onUp={() => setAt(tab, { ...cur, sections: moveIn(cur.sections, i, -1) })}
                onDown={() => setAt(tab, { ...cur, sections: moveIn(cur.sections, i, 1) })}
                onDel={() => setAt(tab, { ...cur, sections: cur.sections.filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          <Button variant="outline" onClick={() => setAt(tab, { ...cur, sections: [...cur.sections, { h: '', p: '' }] })}>
            Thêm mục
          </Button>
          <SaveBar k={tab} />
        </div>
      )}
    </div>
  );
}

const moveIn = (arr, i, dir) => {
  const a = [...arr];
  const j = i + dir;
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

const RowOps = ({ onUp, onDown, onDel }) => (
  <div className="mt-2 flex gap-1.5">
    <Button size="sm" variant="ghost" onClick={onUp} aria-label="Lên">↑</Button>
    <Button size="sm" variant="ghost" onClick={onDown} aria-label="Xuống">↓</Button>
    <Button size="sm" variant="outline" onClick={onDel}>Xóa</Button>
  </div>
);
