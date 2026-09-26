import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Select, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader } from '../components/ui/table';
import { Tabs, ConfirmDialog, IconButton, RowActions } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { VariantPicker, PickedTag } from '../components/pickers';


const warehousePayload = (value = {}) => ({
  code: value.code || '',
  name: value.name || '',
  address: value.address || null,
  province_code: value.province_code || null,
  district_code: value.district_code || null,
  ward_code: value.ward_code || null,
  status: value.status === 'inactive' ? 'inactive' : 'active',
});

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
  const [whEditing, setWhEditing] = useState(null);
  const [wh, setWh] = useState({});
  const [whSaving, setWhSaving] = useState(false);
  const [whToggleId, setWhToggleId] = useState(null);
  const [whDeleteTarget, setWhDeleteTarget] = useState(null);
  const [whForceDeleteTarget, setWhForceDeleteTarget] = useState(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [stockEditing, setStockEditing] = useState(null);
  const [picked, setPicked] = useState(null);
  const [st, setSt] = useState({});
  const [stockSaving, setStockSaving] = useState(false);
  const [stockDeleteTarget, setStockDeleteTarget] = useState(null);
  const [stockForceDeleteTarget, setStockForceDeleteTarget] = useState(null);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adj, setAdj] = useState({});
  const [adjSaving, setAdjSaving] = useState(false);

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

  const startWhCreate = () => {
    setWhEditing(null);
    setWh({ status: 'active' });
    setWhOpen(true);
  };
  const startWhEdit = (row) => {
    setWhEditing(row);
    setWh({ ...row, status: row.status || 'active' });
    setWhOpen(true);
  };
  const closeWh = () => {
    if (whSaving) return;
    setWhOpen(false);
    setWhEditing(null);
    setWh({});
  };
  const handleWhOpenChange = (open) => {
    if (open) setWhOpen(true);
    else closeWh();
  };
  const saveWh = async () => {
    if (!wh.code?.trim() || !wh.name?.trim()) return toast.error('Nhập mã và tên kho');
    setWhSaving(true);
    try {
      const payload = warehousePayload(wh);
      if (whEditing?.id) await api.put(`/inventory/warehouses/${whEditing.id}`, payload);
      else await api.post('/inventory/warehouses', payload);
      toast.success(whEditing?.id ? 'Đã cập nhật kho' : 'Đã thêm kho');
      setWhOpen(false);
      setWhEditing(null);
      setWh({});
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setWhSaving(false);
    }
  };
  const toggleWh = async (row) => {
    if (whToggleId !== null) return;
    const status = row.status === 'active' ? 'inactive' : 'active';
    setWhToggleId(row.id);
    try {
      await api.put(`/inventory/warehouses/${row.id}`, warehousePayload({ ...row, status }));
      toast.success(status === 'active' ? 'Đã kích hoạt kho' : 'Đã ngừng hoạt động kho');
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setWhToggleId(null);
    }
  };
  const removeWh = async () => {
    const target = whDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/inventory/warehouses/${target.id}`);
      toast.success('Đã xóa kho');
      setWhDeleteTarget(null);
      load(true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        toast.warning(errMsg(e));
        setWhDeleteTarget(null);
        setWhForceDeleteTarget({
          ...target,
          stockRows: Number(e.response.data.stock_rows) || 0,
          movements: Number(e.response.data.movements) || 0,
          adjustments: Number(e.response.data.adjustments) || 0,
        });
      } else {
        toast.error(errMsg(e));
      }
    }
  };
  const forceRemoveWh = async () => {
    const target = whForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/inventory/warehouses/${target.id}?force=1`);
      toast.success('Đã xóa kho và dữ liệu liên quan');
      setWhForceDeleteTarget(null);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const startStockCreate = () => {
    setStockEditing(null);
    setPicked(null);
    setSt({ reorder_level: 0 });
    setStockOpen(true);
  };
  const startStockEdit = (row) => {
    setStockEditing(row);
    setPicked({ id: row.variant_id, sku: row.sku || '', name: row.variant_name || '' });
    setSt({ warehouse_id: row.warehouse_id, quantity: row.quantity, reorder_level: row.reorder_level ?? 0 });
    setStockOpen(true);
  };
  const closeStock = () => {
    if (stockSaving) return;
    setStockOpen(false);
    setStockEditing(null);
    setPicked(null);
    setSt({});
  };
  const handleStockOpenChange = (open) => {
    if (open) setStockOpen(true);
    else closeStock();
  };
  const saveStock = async () => {
    if (!picked) return toast.warning('Chọn biến thể bên dưới');
    if (!st.warehouse_id || st.quantity === undefined || st.quantity === '') return toast.error('Chọn kho và số lượng');
    if (Number(st.quantity) < 0) return toast.error('Số lượng không được âm');
    setStockSaving(true);
    try {
      await api.put('/inventory/stocks', {
        warehouse_id: Number(st.warehouse_id),
        variant_id: Number(picked.id),
        quantity: Number(st.quantity),
        reorder_level: Number(st.reorder_level) || 0,
      });
      toast.success(stockEditing ? 'Đã cập nhật tồn kho' : 'Đã cập nhật tồn');
      setStockOpen(false);
      setStockEditing(null);
      setPicked(null);
      setSt({});
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setStockSaving(false);
    }
  };
  const removeStock = async () => {
    const target = stockDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/inventory/stocks?warehouse_id=${target.warehouse_id}&variant_id=${target.variant_id}`);
      toast.success('Đã xóa mục tồn kho');
      setStockDeleteTarget(null);
      load(true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        toast.warning(errMsg(e));
        setStockDeleteTarget(null);
        setStockForceDeleteTarget({ ...target, quantity: Number(e.response.data.quantity) || 0 });
      } else {
        toast.error(errMsg(e));
      }
    }
  };
  const forceRemoveStock = async () => {
    const target = stockForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/inventory/stocks?warehouse_id=${target.warehouse_id}&variant_id=${target.variant_id}&force=1`);
      toast.success('Đã xóa mục tồn kho và ghi giảm số lượng');
      setStockForceDeleteTarget(null);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const startAdjCreate = () => {
    setPicked(null);
    setAdj({});
    setAdjOpen(true);
  };
  const closeAdj = () => {
    if (adjSaving) return;
    setAdjOpen(false);
    setPicked(null);
    setAdj({});
  };
  const handleAdjOpenChange = (open) => {
    if (open) setAdjOpen(true);
    else closeAdj();
  };
  const saveAdj = async () => {
    if (!picked) return toast.warning('Chọn biến thể bên dưới');
    if (!adj.warehouse_id || adj.new_quantity === undefined || adj.new_quantity === '' || !adj.reason?.trim()) return toast.error('Điền đủ kho, tồn mới, lý do');
    if (Number(adj.new_quantity) < 0) return toast.error('Tồn mới không được âm');
    setAdjSaving(true);
    try {
      await api.post('/inventory/adjustments', {
        warehouse_id: Number(adj.warehouse_id),
        reason: adj.reason,
        items: [{ variant_id: Number(picked.id), new_quantity: Number(adj.new_quantity) }],
      });
      toast.success('Đã tạo phiếu điều chỉnh');
      setAdjOpen(false);
      setPicked(null);
      setAdj({});
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAdjSaving(false);
    }
  };
  const [postTarget, setPostTarget] = useState(null);
  const [postBusy, setPostBusy] = useState(false);
  const postAdj = async () => {
    if (!postTarget) return;
    setPostBusy(true);
    try {
      await api.post(`/inventory/adjustments/${postTarget.id}/post`);
      toast.success('Đã chốt phiếu');
      setPostTarget(null);
      load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPostBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Kho hàng" actions={writable && tab === 'stock' && <Button onClick={startStockCreate}><Plus />Nhập / cập nhật tồn</Button>} />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'stock', label: 'Tồn kho' }, { key: 'wh', label: 'Kho hàng' },
          { key: 'move', label: 'Xuất nhập kho' }, { key: 'adj', label: 'Điều chỉnh' }, { key: 'trf', label: 'Chuyển kho' },
        ]} />
        {tab === 'stock' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Kho</Th><Th>SKU</Th><Th>Tên</Th><Th>Tồn</Th><Th>Giữ</Th><Th>Khả dụng</Th><Th>Ngưỡng</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{stocks.map((r) => <Tr key={r.warehouse_id + '-' + r.variant_id}>
              <Td>{r.warehouse_code}</Td><Td>{r.sku}</Td><Td>{r.variant_name}</Td><Td>{r.quantity}</Td>
              <Td>{r.reserved_quantity}</Td><Td>{r.quantity - r.reserved_quantity}</Td><Td>{r.reorder_level}</Td>
              <Td><RowActions>{writable && (<>
                <IconButton label="Sửa tồn kho" onClick={() => startStockEdit(r)}><Pencil /></IconButton>
                <IconButton label="Xóa mục tồn kho" onClick={() => setStockDeleteTarget(r)}><Trash2 className="text-red-600" /></IconButton>
              </>)}</RowActions></Td>
            </Tr>)}</tbody>
          </table></TableWrap>
          {!stocks.length && <Empty />}
        </>)}
        {tab === 'wh' && (<>
          {writable && <div className="mb-3"><Button onClick={startWhCreate}><Plus />Thêm kho</Button></div>}
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Mã</Th><Th>Tên</Th><Th>Địa chỉ</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{whs.map((w) => <Tr key={w.id}>
              <Td>{w.code}</Td><Td>{w.name}</Td><Td>{w.address}</Td>
              <Td><Badge color={w.status === 'active' ? 'green' : 'default'}>{w.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge></Td>
              <Td><RowActions>{writable && (<>
                <IconButton label={w.status === 'active' ? 'Ngừng hoạt động kho' : 'Kích hoạt kho'} onClick={() => toggleWh(w)} disabled={whToggleId === w.id}>
                  {w.status === 'active' ? <EyeOff /> : <Eye />}
                </IconButton>
                <IconButton label="Sửa kho" onClick={() => startWhEdit(w)}><Pencil /></IconButton>
                <IconButton label="Xóa kho" onClick={() => setWhDeleteTarget(w)}><Trash2 className="text-red-600" /></IconButton>
              </>)}</RowActions></Td>
            </Tr>)}</tbody>
          </table></TableWrap>
          {!whs.length && <Empty />}
        </>)}
        {tab === 'move' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Kho</Th><Th>Biến thể</Th><Th>Loại</Th><Th>Số lượng</Th><Th>Tham chiếu</Th><Th>Ghi chú</Th><Th>Lúc</Th></Tr></THead>
            <tbody>{moves.map((m) => <Tr key={m.id}><Td>{m.warehouse_id}</Td><Td>{m.variant_id}</Td>
              <Td><Badge>{t('move', m.type)}</Badge></Td><Td>{m.quantity}</Td><Td>{m.reference_type}</Td><Td>{m.note}</Td><Td className="whitespace-nowrap">{fmtDate(m.created_at)}</Td></Tr>)}</tbody>
          </table></TableWrap>
          {!moves.length && <Empty />}
        </>)}
        {tab === 'adj' && (<>
          {writable && <div className="mb-3"><Button onClick={startAdjCreate}><Plus />Tạo phiếu</Button></div>}
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số phiếu</Th><Th>Kho</Th><Th>Lý do</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></Tr></THead>
            <tbody>{adjs.map((a) => <Tr key={a.id}><Td>{a.adjustment_number}</Td><Td>{a.warehouse_id}</Td><Td>{a.reason}</Td>
              <Td><Badge>{t('adjust', a.status)}</Badge></Td>
              <Td>{writable && a.status === 'draft' && <Button size="sm" onClick={() => setPostTarget(a)}>Chốt</Button>}</Td></Tr>)}</tbody>
          </table></TableWrap>
          {!adjs.length && <Empty />}
        </>)}
        {tab === 'trf' && (<>
          <TableWrap><table className="w-full text-sm">
            <THead><Tr><Th>Số</Th><Th>Từ kho</Th><Th>Đến kho</Th><Th>Trạng thái</Th></Tr></THead>
            <tbody>{trfs.map((x) => <Tr key={x.id}><Td>{x.transfer_number}</Td><Td>{x.source_warehouse_id}</Td><Td>{x.destination_warehouse_id}</Td>
              <Td><Badge>{t('transfer', x.status)}</Badge></Td></Tr>)}</tbody>
          </table></TableWrap>
          {!trfs.length && <Empty />}
        </>)}
      </CardContent></Card>

      <Dialog open={whOpen} onOpenChange={handleWhOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>{whEditing?.id ? 'Sửa kho' : 'Thêm kho'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã kho *"><Input value={wh.code || ''} onChange={(e) => setWh({ ...wh, code: e.target.value })} disabled={whSaving} /></Field>
            <Field label="Tên kho *"><Input value={wh.name || ''} onChange={(e) => setWh({ ...wh, name: e.target.value })} disabled={whSaving} /></Field>
            <Field label="Địa chỉ" className="sm:col-span-2"><Input value={wh.address || ''} onChange={(e) => setWh({ ...wh, address: e.target.value })} disabled={whSaving} /></Field>
            <Field label="Trạng thái">
              <Select value={wh.status || 'active'} onChange={(e) => setWh({ ...wh, status: e.target.value })} disabled={whSaving}>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={whSaving} onClick={closeWh}>Hủy</Button>
            <Button disabled={whSaving} onClick={saveWh}>{whSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={handleStockOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{stockEditing ? 'Sửa tồn kho' : 'Nhập / cập nhật tồn'}</DialogTitle></DialogHeader>
          <Field label="Biến thể">
            {stockEditing
              ? <PickedTag text={`${picked?.sku || ''} · ${picked?.name || ''}`} onClear={() => { setPicked(null); setStockEditing(null); }} />
              : picked
                ? <PickedTag text={`${picked.sku} · ${picked.name}`} onClear={() => setPicked(null)} />
                : <VariantPicker onPick={(v) => setPicked(v)} />}
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kho *">
              <Select value={st.warehouse_id || ''} onChange={(e) => setSt({ ...st, warehouse_id: e.target.value ? Number(e.target.value) : null })} disabled={stockSaving}>
                <option value="">Chọn...</option>
                {whs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </Select>
            </Field>
            <Field label="Số lượng *"><Input type="number" min={0} value={st.quantity ?? ''} onChange={(e) => setSt({ ...st, quantity: e.target.value === '' ? '' : Number(e.target.value) })} disabled={stockSaving} /></Field>
            <Field label="Ngưỡng"><Input type="number" min={0} value={st.reorder_level ?? ''} onChange={(e) => setSt({ ...st, reorder_level: e.target.value === '' ? '' : Number(e.target.value) })} disabled={stockSaving} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={stockSaving} onClick={closeStock}>Hủy</Button>
            <Button disabled={stockSaving} onClick={saveStock}>{stockSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjOpen} onOpenChange={handleAdjOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Phiếu điều chỉnh</DialogTitle></DialogHeader>
          <Field label="Biến thể">
            {picked ? <PickedTag text={`${picked.sku} · ${picked.name}`} onClear={() => setPicked(null)} />
              : <VariantPicker onPick={(v) => setPicked(v)} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kho *">
              <Select value={adj.warehouse_id || ''} onChange={(e) => setAdj({ ...adj, warehouse_id: e.target.value ? Number(e.target.value) : null })} disabled={adjSaving}>
                <option value="">Chọn...</option>
                {whs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </Select>
            </Field>
            <Field label="Tồn mới *"><Input type="number" min={0} value={adj.new_quantity ?? ''} onChange={(e) => setAdj({ ...adj, new_quantity: e.target.value === '' ? '' : Number(e.target.value) })} disabled={adjSaving} /></Field>
          </div>
          <Field label="Lý do *"><Input value={adj.reason || ''} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} disabled={adjSaving} /></Field>
          <DialogFooter>
            <Button variant="outline" disabled={adjSaving} onClick={closeAdj}>Hủy</Button>
            <Button disabled={adjSaving} onClick={saveAdj}>{adjSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!whDeleteTarget}
        onOpenChange={(open) => !open && setWhDeleteTarget(null)}
        title="Xóa kho"
        description={`Kho “${whDeleteTarget?.name || ''}” sẽ bị xóa khỏi danh sách.`}
        onConfirm={removeWh}
      />
      <ConfirmDialog
        open={!!whForceDeleteTarget}
        onOpenChange={(open) => !open && setWhForceDeleteTarget(null)}
        title="Xóa kho và dữ liệu liên quan?"
        description={`Kho “${whForceDeleteTarget?.name || ''}” còn ${whForceDeleteTarget?.stockRows || 0} mục tồn, ${whForceDeleteTarget?.movements || 0} phiếu nhập/xuất và ${whForceDeleteTarget?.adjustments || 0} phiếu điều chỉnh. Xóa cưỡng chế sẽ không thể khôi phục.`}
        confirmText="Xóa cưỡng chế"
        onConfirm={forceRemoveWh}
      />
      <ConfirmDialog
        open={!!stockDeleteTarget}
        onOpenChange={(open) => !open && setStockDeleteTarget(null)}
        title="Xóa mục tồn kho"
        description={`Mục tồn của biến thể “${stockDeleteTarget?.variant_name || ''}” tại kho “${stockDeleteTarget?.warehouse_code || ''}” sẽ bị xóa.`}
        onConfirm={removeStock}
      />
      <ConfirmDialog
        open={!!stockForceDeleteTarget}
        onOpenChange={(open) => !open && setStockForceDeleteTarget(null)}
        title="Xóa mục tồn kho?"
        description={`Mục tồn còn ${stockForceDeleteTarget?.quantity || 0} sản phẩm. Hệ thống sẽ ghi một phiếu điều chỉnh giảm số lượng rồi xóa mục tồn.`}
        confirmText="Xóa và ghi giảm"
        onConfirm={forceRemoveStock}
      />
      <ConfirmDialog
        open={!!postTarget}
        onOpenChange={(next) => !next && setPostTarget(null)}
        title="Chốt phiếu điều chỉnh?"
        description={`Phiếu ${postTarget?.code || postTarget?.id || ''} sẽ được ghi vào tồn kho thật. Sau khi chốt không thể sửa.`}
        confirmText="Chốt phiếu"
        tone="default"
        busy={postBusy}
        onConfirm={postAdj}
      />
    </div>
  );
}
