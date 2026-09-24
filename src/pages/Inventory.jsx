import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { VariantPicker, PickedTag } from '../components/pickers';

const inputCls = 'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm';

export default function Inventory() {
  const { can } = useAuth();
  const writable = can('inventory.write');
  const [tab, setTab] = useState('stock');
  const [whs, setWhs] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [moves, setMoves] = useState([]);
  const [adjs, setAdjs] = useState([]);
  const [trfs, setTrfs] = useState([]);
  const [whOpen, setWhOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [wh, setWh] = useState({});
  const [st, setSt] = useState({});
  const [adj, setAdj] = useState({});

  const load = (quiet = false) => {
    api.get('/inventory/warehouses').then((r) => setWhs(r.data)).catch(() => {});
    api.get('/inventory/stocks').then((r) => setStocks(r.data)).catch((e) => { if (!quiet) toast.error(errMsg(e)); });
    api.get('/inventory/stock-movements').then((r) => setMoves(r.data)).catch(() => {});
    api.get('/inventory/adjustments').then((r) => setAdjs(r.data)).catch(() => {});
    api.get('/inventory/transfers').then((r) => setTrfs(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 45000);
    return () => clearInterval(id);
  }, []);

  const saveWh = async () => {
    if (!wh.code || !wh.name) return toast.error('Nhập mã và tên kho');
    try { await api.post('/inventory/warehouses', wh); toast.success('Đã thêm kho'); setWhOpen(false); setWh({}); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const saveStock = async () => {
    if (!picked) return toast.warning('Chọn biến thể bên dưới');
    if (!st.warehouse_id || st.quantity === undefined) return toast.error('Chọn kho và số lượng');
    try { await api.put('/inventory/stocks', { ...st, variant_id: picked.id }); toast.success('Đã cập nhật tồn'); setStockOpen(false); setSt({}); setPicked(null); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const saveAdj = async () => {
    if (!picked) return toast.warning('Chọn biến thể bên dưới');
    if (!adj.warehouse_id || adj.new_quantity === undefined || !adj.reason) return toast.error('Điền đủ kho, tồn mới, lý do');
    try {
      await api.post('/inventory/adjustments', { warehouse_id: adj.warehouse_id, reason: adj.reason, items: [{ variant_id: picked.id, new_quantity: adj.new_quantity }] });
      toast.success('Đã tạo phiếu điều chỉnh'); setAdjOpen(false); setAdj({}); setPicked(null); load(true);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const postAdj = async (id) => {
    try { await api.post(`/inventory/adjustments/${id}/post`); toast.success('Đã chốt phiếu'); load(true); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title="Kho hàng" actions={writable && tab === 'stock' && <Button onClick={() => { setPicked(null); setStockOpen(true); }}><Plus />Nhập / set tồn</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'stock', label: 'Tồn kho' }, { key: 'wh', label: 'Kho hàng' },
          { key: 'move', label: 'Xuất nhập kho' }, { key: 'adj', label: 'Điều chỉnh' }, { key: 'trf', label: 'Chuyển kho' },
        ]} />
        {tab === 'stock' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Kho</Th><Th>SKU</Th><Th>Tên</Th><Th>Tồn</Th><Th>Giữ</Th><Th>Khả dụng</Th><Th>Ngưỡng</Th></Tr></THead>
            <tbody>{stocks.map((r) => <Tr key={r.warehouse_id + '-' + r.variant_id}>
              <Td>{r.warehouse_code}</Td><Td>{r.sku}</Td><Td>{r.variant_name}</Td><Td>{r.quantity}</Td>
              <Td>{r.reserved_quantity}</Td><Td>{r.quantity - r.reserved_quantity}</Td><Td>{r.reorder_level}</Td>
            </Tr>)}</tbody>
          </table></TableWrap>
          {!stocks.length && <Empty />}
        </>)}
        {tab === 'wh' && (<>
          {writable && <div className="mb-3"><Button onClick={() => setWhOpen(true)}><Plus />Thêm kho</Button></div>}
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Tên</Th><Th>Địa chỉ</Th><Th>Trạng thái</Th></Tr></THead>
            <tbody>{whs.map((w) => <Tr key={w.id}><Td>{w.code}</Td><Td>{w.name}</Td><Td>{w.address}</Td>
              <Td><Badge color={w.status === 'active' ? 'green' : 'default'}>{t('warehouse', w.status)}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
        </>)}
        {tab === 'move' && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Kho</Th><Th>Biến thể</Th><Th>Loại</Th><Th>SL</Th><Th>Tham chiếu</Th><Th>Ghi chú</Th><Th>Lúc</Th></Tr></THead>
            <tbody>{moves.map((m) => <Tr key={m.id}><Td>{m.warehouse_id}</Td><Td>{m.variant_id}</Td>
              <Td><Badge>{t('move', m.type)}</Badge></Td><Td>{m.quantity}</Td><Td>{m.reference_type}</Td><Td>{m.note}</Td><Td className="whitespace-nowrap">{fmtDate(m.created_at)}</Td></Tr>)}</tbody>
          </table></TableWrap>
        )}
        {tab === 'adj' && (<>
          {writable && <div className="mb-3"><Button onClick={() => { setPicked(null); setAdjOpen(true); }}><Plus />Tạo phiếu</Button></div>}
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số phiếu</Th><Th>Kho</Th><Th>Lý do</Th><Th>Trạng thái</Th><Th /></Tr></THead>
            <tbody>{adjs.map((a) => <Tr key={a.id}><Td>{a.adjustment_number}</Td><Td>{a.warehouse_id}</Td><Td>{a.reason}</Td>
              <Td><Badge>{t('adjust', a.status)}</Badge></Td>
              <Td>{writable && a.status === 'draft' && <Button size="sm" onClick={() => postAdj(a.id)}>Chốt</Button>}</Td></Tr>)}</tbody>
          </table></TableWrap>
        </>)}
        {tab === 'trf' && (
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số</Th><Th>Từ kho</Th><Th>Đến kho</Th><Th>Trạng thái</Th></Tr></THead>
            <tbody>{trfs.map((x) => <Tr key={x.id}><Td>{x.transfer_number}</Td><Td>{x.source_warehouse_id}</Td><Td>{x.destination_warehouse_id}</Td>
              <Td><Badge>{t('transfer', x.status)}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
        )}
      </CardContent></Card>

      <Dialog open={whOpen} onOpenChange={setWhOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm kho</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã kho *"><Input value={wh.code || ''} onChange={(e) => setWh({ ...wh, code: e.target.value })} /></Field>
            <Field label="Tên kho *"><Input value={wh.name || ''} onChange={(e) => setWh({ ...wh, name: e.target.value })} /></Field>
            <Field label="Địa chỉ" className="sm:col-span-2"><Input value={wh.address || ''} onChange={(e) => setWh({ ...wh, address: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhOpen(false)}>Hủy</Button>
            <Button onClick={saveWh}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Nhập / set tồn</DialogTitle></DialogHeader>
          <Field label="Biến thể">
            {picked ? <PickedTag text={`${picked.sku} · ${picked.name}`} onClear={() => setPicked(null)} />
              : <VariantPicker onPick={(v) => setPicked(v)} />}
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kho *">
              <select className={inputCls} value={st.warehouse_id || ''} onChange={(e) => setSt({ ...st, warehouse_id: Number(e.target.value) })}>
                <option value="">Chọn...</option>
                {whs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select>
            </Field>
            <Field label="Số lượng *"><Input type="number" min={0} value={st.quantity ?? ''} onChange={(e) => setSt({ ...st, quantity: Number(e.target.value) })} /></Field>
            <Field label="Ngưỡng"><Input type="number" min={0} value={st.reorder_level ?? ''} onChange={(e) => setSt({ ...st, reorder_level: Number(e.target.value) })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockOpen(false)}>Hủy</Button>
            <Button onClick={saveStock}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Phiếu điều chỉnh</DialogTitle></DialogHeader>
          <Field label="Biến thể">
            {picked ? <PickedTag text={`${picked.sku} · ${picked.name}`} onClear={() => setPicked(null)} />
              : <VariantPicker onPick={(v) => setPicked(v)} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kho *">
              <select className={inputCls} value={adj.warehouse_id || ''} onChange={(e) => setAdj({ ...adj, warehouse_id: Number(e.target.value) })}>
                <option value="">Chọn...</option>
                {whs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select>
            </Field>
            <Field label="Tồn mới *"><Input type="number" min={0} value={adj.new_quantity ?? ''} onChange={(e) => setAdj({ ...adj, new_quantity: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Lý do *"><Input value={adj.reason || ''} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} /></Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Hủy</Button>
            <Button onClick={saveAdj}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
