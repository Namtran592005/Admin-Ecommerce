import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t } from '../utils/status';
import { Button } from '../components/ui/button';
import { Input, Select, Textarea, Field } from '../components/ui/input';
import { Card, CardContent, Badge } from '../components/ui/card';
import { TableWrap, THead, Tr, Th, Td, Empty, PageHeader, Toolbar } from '../components/ui/table';
import { ConfirmDialog, IconButton, RowActions, StatusBadge, Tabs, TableSearch, useRowFilter } from '../components/ui/misc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const COUPON_TYPES = [
  { value: 'percentage', label: 'Giảm phần trăm' },
  { value: 'fixed', label: 'Giảm tiền' },
  { value: 'free_shipping', label: 'Miễn phí vận chuyển' },
];
const PROMOTION_TYPES = [
  { value: 'percentage', label: 'Giảm phần trăm' },
  { value: 'fixed', label: 'Giảm tiền' },
  { value: 'buy_x_get_y', label: 'Mua X tặng Y' },
  { value: 'free_shipping', label: 'Miễn phí vận chuyển' },
  { value: 'bundle', label: 'Gói ưu đãi' },
];
const PROMOTION_STATUS_COLORS = {
  active: 'green',
  scheduled: 'blue',
  draft: 'default',
  inactive: 'orange',
  expired: 'red',
};
const EMPTY_COUPON = {
  code: '',
  type: 'percentage',
  value: '',
  minimum_order_amount: '',
  maximum_discount_amount: '',
  usage_limit: '',
  usage_limit_per_user: '',
  from: '',
  to: '',
  status: 'draft',
};
const EMPTY_PROMOTION = {
  name: '',
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  minimum_order_amount: '',
  maximum_discount_amount: '',
  usage_limit: '',
  from: '',
  to: '',
  priority: 0,
  stackable: false,
  status: 'draft',
};

const toDateTimeInput = (value) => value ? String(value).slice(0, 16).replace(' ', 'T') : '';
const toApiDateTime = (value) => value ? `${value.replace('T', ' ')}:00` : null;
const numberOrNull = (value) => value === '' || value === undefined || value === null ? null : Number(value);
const usageText = (used, limit) => `${Number(used || 0)} / ${limit || 'Không giới hạn'}`;

export default function Promotions() {
  const { can } = useAuth();
  const writable = can('promotions.write');
  const [tab, setTab] = useState('cp');
  const [q, setQ] = useState('');
  const [promos, setPromos] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [redems, setRedems] = useState([]);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponEditing, setCouponEditing] = useState(null);
  const [couponForm, setCouponForm] = useState({ ...EMPTY_COUPON });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponToggleId, setCouponToggleId] = useState(null);
  const [couponDeleteTarget, setCouponDeleteTarget] = useState(null);
  const [couponForceDeleteTarget, setCouponForceDeleteTarget] = useState(null);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionEditing, setPromotionEditing] = useState(null);
  const [promotionForm, setPromotionForm] = useState({ ...EMPTY_PROMOTION });
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionToggleId, setPromotionToggleId] = useState(null);
  const [promotionDeleteTarget, setPromotionDeleteTarget] = useState(null);
  const [promotionForceDeleteTarget, setPromotionForceDeleteTarget] = useState(null);

  const load = async (quiet = false) => {
    const results = await Promise.allSettled([
      api.get('/promos/promotions').then((response) => setPromos(response.data)),
      api.get('/promos/coupons').then((response) => setCoupons(response.data)),
      api.get('/promos/redemptions').then((response) => setRedems(response.data)),
    ]);
    if (!quiet) {
      results.forEach((result) => {
        if (result.status === 'rejected') toast.error(errMsg(result.reason));
      });
    }
  };

  useEffect(() => { load(); }, []);

  const setCouponField = (key, value) => setCouponForm((current) => ({ ...current, [key]: value }));
  const setPromotionField = (key, value) => setPromotionForm((current) => ({ ...current, [key]: value }));

  const openCouponCreate = () => {
    setCouponEditing(null);
    setCouponForm({ ...EMPTY_COUPON });
    setCouponOpen(true);
  };

  const openCouponEdit = (coupon) => {
    setCouponEditing(coupon);
    setCouponForm({
      code: coupon.code || '',
      type: coupon.type || 'percentage',
      value: coupon.value ?? '',
      minimum_order_amount: coupon.minimum_order_amount ?? '',
      maximum_discount_amount: coupon.maximum_discount_amount ?? '',
      usage_limit: coupon.usage_limit ?? '',
      usage_limit_per_user: coupon.usage_limit_per_user ?? '',
      from: toDateTimeInput(coupon.starts_at),
      to: toDateTimeInput(coupon.expires_at),
      status: coupon.status || 'draft',
    });
    setCouponOpen(true);
  };

  const closeCouponDialog = (open) => {
    if (couponSaving) return;
    setCouponOpen(open);
    if (!open) setCouponEditing(null);
  };

  const saveCoupon = async () => {
    const code = couponForm.code.trim().toUpperCase();
    if (!code) return toast.error('Vui nhập mã');
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return toast.error('Mã chỉ gồm chữ in hoa, số, gạch dưới, gạch ngang (3-30 ký tự)');
    const isFreeShip = couponForm.type === 'free_shipping';
    const v = Number(couponForm.value);
    if (!isFreeShip) {
      if (couponForm.value === '' || couponForm.value === undefined || !Number.isFinite(v)) {
        return toast.error('Vui nhập giá trị');
      }
      if (couponForm.type === 'percentage' && (v < 0 || v > 100)) return toast.error('Phần trăm phải từ 0 đến 100');
      if (couponForm.type === 'fixed' && v <= 0) return toast.error('Số tiền giảm phải lớn hơn 0');
    }
    if (couponForm.from && couponForm.to && new Date(couponForm.to) <= new Date(couponForm.from)) {
      return toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    const body = {
      code,
      type: couponForm.type,
      value: isFreeShip ? 0 : v,
      minimum_order_amount: numberOrNull(couponForm.minimum_order_amount),
      maximum_discount_amount: numberOrNull(couponForm.maximum_discount_amount),
      usage_limit: numberOrNull(couponForm.usage_limit),
      usage_limit_per_user: numberOrNull(couponForm.usage_limit_per_user),
      starts_at: toApiDateTime(couponForm.from),
      expires_at: toApiDateTime(couponForm.to),
      status: couponForm.status,
    };
    setCouponSaving(true);
    try {
      if (couponEditing) await api.put(`/promos/coupons/${couponEditing.id}`, body);
      else await api.post('/promos/coupons', body);
      toast.success(couponEditing ? 'Đã cập nhật mã giảm giá' : 'Đã thêm mã giảm giá');
      setCouponOpen(false);
      setCouponEditing(null);
      setCouponForm({ ...EMPTY_COUPON });
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCouponSaving(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    if (couponToggleId !== null) return;
    setCouponToggleId(coupon.id);
    try {
      const { data } = await api.patch(`/promos/coupons/${coupon.id}/toggle`);
      toast.success(data.status === 'active' ? 'Đã kích hoạt' : 'Đã ngừng');
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCouponToggleId(null);
    }
  };

  const deleteCoupon = async () => {
    const target = couponDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/promos/coupons/${target.id}`);
      toast.success('Đã xóa mã giảm giá');
      setCouponDeleteTarget(null);
      await load(true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        const redemptionCount = Number(e.response.data.redemption_count) || 0;
        toast.error(errMsg(e));
        toast.warning(`Mã giảm giá đã có ${redemptionCount} lượt sử dụng. Xóa cưỡng chế sẽ xóa cả lịch sử sử dụng.`);
        setCouponDeleteTarget(null);
        setCouponForceDeleteTarget({ ...target, redemptionCount });
      } else {
        toast.error(errMsg(e));
      }
    }
  };

  const forceDeleteCoupon = async () => {
    const target = couponForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/promos/coupons/${target.id}?force=1`);
      toast.success('Đã xóa mã giảm giá và lịch sử sử dụng');
      setCouponForceDeleteTarget(null);
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const openPromotionCreate = () => {
    setPromotionEditing(null);
    setPromotionForm({ ...EMPTY_PROMOTION });
    setPromotionOpen(true);
  };

  const openPromotionEdit = (promotion) => {
    setPromotionEditing(promotion);
    setPromotionForm({
      name: promotion.name || '',
      code: promotion.code || '',
      description: promotion.description || '',
      type: promotion.type || 'percentage',
      value: promotion.value ?? '',
      minimum_order_amount: promotion.minimum_order_amount ?? '',
      maximum_discount_amount: promotion.maximum_discount_amount ?? '',
      usage_limit: promotion.usage_limit ?? '',
      from: toDateTimeInput(promotion.starts_at),
      to: toDateTimeInput(promotion.ends_at),
      priority: promotion.priority ?? 0,
      stackable: Boolean(promotion.stackable),
      status: promotion.status || 'draft',
    });
    setPromotionOpen(true);
  };

  const closePromotionDialog = (open) => {
    if (promotionSaving) return;
    setPromotionOpen(open);
    if (!open) setPromotionEditing(null);
  };

  const savePromotion = async () => {
    const name = promotionForm.name.trim();
    if (!name || !promotionForm.type) {
      toast.error('Vui nhập tên và loại chương trình');
      return;
    }
    if (promotionForm.starts_at && promotionForm.ends_at && new Date(promotionForm.ends_at) <= new Date(promotionForm.starts_at)) {
      return toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (promotionForm.type === 'percentage' && numberOrNull(promotionForm.value) > 100) {
      return toast.error('Phần trăm phải từ 0 đến 100');
    }
    const body = {
      name,
      code: promotionForm.code.trim() || null,
      description: promotionForm.description.trim() || null,
      type: promotionForm.type,
      value: numberOrNull(promotionForm.value),
      minimum_order_amount: numberOrNull(promotionForm.minimum_order_amount),
      maximum_discount_amount: numberOrNull(promotionForm.maximum_discount_amount),
      usage_limit: numberOrNull(promotionForm.usage_limit),
      starts_at: toApiDateTime(promotionForm.from),
      ends_at: toApiDateTime(promotionForm.to),
      priority: Number(promotionForm.priority || 0),
      stackable: Boolean(promotionForm.stackable),
      status: promotionForm.status,
    };
    setPromotionSaving(true);
    try {
      if (promotionEditing) await api.put(`/promos/promotions/${promotionEditing.id}`, body);
      else await api.post('/promos/promotions', body);
      toast.success(promotionEditing ? 'Đã cập nhật chương trình' : 'Đã thêm chương trình');
      setPromotionOpen(false);
      setPromotionEditing(null);
      setPromotionForm({ ...EMPTY_PROMOTION });
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPromotionSaving(false);
    }
  };

  const togglePromotion = async (promotion) => {
    if (promotionToggleId !== null) return;
    setPromotionToggleId(promotion.id);
    try {
      const { data } = await api.patch(`/promos/promotions/${promotion.id}/toggle`);
      toast.success(data.status === 'active' ? 'Đã kích hoạt' : 'Đã ngừng');
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPromotionToggleId(null);
    }
  };

  const deletePromotion = async () => {
    const target = promotionDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/promos/promotions/${target.id}`);
      toast.success('Đã xóa chương trình');
      setPromotionDeleteTarget(null);
      await load(true);
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.can_force) {
        const productCount = Number(e.response.data.product_count) || 0;
        toast.error(errMsg(e));
        toast.warning(`Chương trình còn ${productCount} sản phẩm được liên kết. Xóa cưỡng chế sẽ gỡ toàn bộ liên kết này.`);
        setPromotionDeleteTarget(null);
        setPromotionForceDeleteTarget({ ...target, productCount });
      } else {
        toast.error(errMsg(e));
      }
    }
  };

  const forceDeletePromotion = async () => {
    const target = promotionForceDeleteTarget;
    if (!target) return;
    try {
      await api.delete(`/promos/promotions/${target.id}?force=1`);
      toast.success('Đã xóa chương trình và các liên kết sản phẩm');
      setPromotionForceDeleteTarget(null);
      await load(true);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const fCoupons = useRowFilter(coupons, q, (r) => `${r.code} ${r.description || ''} ${r.status || ''}`);
  const fPromos = useRowFilter(promos, q, (r) => `${r.name} ${r.code} ${r.status || ''}`);
  const fRedems = useRowFilter(redems, q, (r) => `${r.code || ''} ${r.order_id || ''} ${r.customer_id || ''}`);

  return (
    <div>
      <PageHeader
        title="Khuyến mãi"
        actions={writable && (
          tab === 'cp' ? <Button onClick={openCouponCreate}><Plus />Thêm mã</Button>
            : tab === 'pr' ? <Button onClick={openPromotionCreate}><Plus />Thêm chương trình</Button>
              : null
        )}
      />
      <Card><CardContent className="pt-4">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'cp', label: 'Mã giảm giá' },
          { key: 'pr', label: 'Chương trình KM' },
          { key: 'rd', label: 'Lượt dùng coupon' },
        ]} />
        <Toolbar><TableSearch value={q} onChange={setQ} placeholder="Tìm trong bảng đang xem..." /></Toolbar>
        {tab === 'cp' && (<>
          <TableWrap>
            <table className="w-full text-sm">
              <THead><Tr>
                <Th>Mã</Th><Th>Loại</Th><Th>Giá trị</Th><Th>Đơn tối thiểu</Th><Th>Đã dùng</Th><Th>Trạng thái</Th><Th>Hết hạn</Th><Th className="text-right">Thao tác</Th>
              </Tr></THead>
              <tbody>{fCoupons.map((coupon) => (
                <Tr key={coupon.id}>
                  <Td><Badge color="gold">{coupon.code}</Badge></Td>
                  <Td>{COUPON_TYPES.find((type) => type.value === coupon.type)?.label || coupon.type}</Td>
                  <Td>{coupon.value}</Td>
                  <Td>{fmtVND(coupon.minimum_order_amount)}</Td>
                  <Td>{coupon.used_count || 0}</Td>
                  <Td><StatusBadge group="coupon" value={coupon.status} /></Td>
                  <Td className="whitespace-nowrap">{fmtDate(coupon.expires_at)}</Td>
                  <Td><RowActions>{writable && (<>
                    <IconButton
                      label={coupon.status === 'active' ? 'Tắt mã giảm giá' : 'Kích hoạt mã giảm giá'}
                      onClick={() => toggleCoupon(coupon)}
                      disabled={couponToggleId === coupon.id}
                    >
                      {coupon.status === 'active' ? <EyeOff /> : <Eye />}
                    </IconButton>
                    <IconButton label="Sửa mã giảm giá" onClick={() => openCouponEdit(coupon)}><Pencil /></IconButton>
                    <IconButton label="Xóa mã giảm giá" onClick={() => setCouponDeleteTarget(coupon)}><Trash2 className="text-red-600" /></IconButton>
                  </>)}</RowActions></Td>
                </Tr>
              ))}</tbody>
            </table>
          </TableWrap>
          {!coupons.length && <Empty />}
        </>)}
        {tab === 'pr' && (<>
          <TableWrap>
            <table className="w-full text-sm">
              <THead><Tr>
                <Th>Tên</Th><Th>Mã</Th><Th>Loại</Th><Th>Giá trị</Th><Th>Lượt dùng</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th>
              </Tr></THead>
              <tbody>{fPromos.map((promotion) => (
                <Tr key={promotion.id}>
                  <Td>{promotion.name}</Td>
                  <Td>{promotion.code || '—'}</Td>
                  <Td>{PROMOTION_TYPES.find((type) => type.value === promotion.type)?.label || promotion.type}</Td>
                  <Td>{promotion.value ?? '—'}</Td>
                  <Td>{usageText(promotion.used_count, promotion.usage_limit)}</Td>
                  <Td><Badge color={PROMOTION_STATUS_COLORS[promotion.status] || 'default'}>{t('promo', promotion.status)}</Badge></Td>
                  <Td><RowActions>{writable && (<>
                    <IconButton
                      label={promotion.status === 'active' ? 'Tắt chương trình' : 'Kích hoạt chương trình'}
                      onClick={() => togglePromotion(promotion)}
                      disabled={promotionToggleId === promotion.id}
                    >
                      {promotion.status === 'active' ? <EyeOff /> : <Eye />}
                    </IconButton>
                    <IconButton label="Sửa chương trình" onClick={() => openPromotionEdit(promotion)}><Pencil /></IconButton>
                    <IconButton label="Xóa chương trình" onClick={() => setPromotionDeleteTarget(promotion)}><Trash2 className="text-red-600" /></IconButton>
                  </>)}</RowActions></Td>
                </Tr>
              ))}</tbody>
            </table>
          </TableWrap>
          {!promos.length && <Empty />}
        </>)}
        {tab === 'rd' && (<>
          <TableWrap>
            <table className="w-full text-sm">
              <THead><Tr><Th>Mã</Th><Th>Khách</Th><Th>Đơn</Th><Th>Giảm</Th><Th>Lúc</Th></Tr></THead>
              <tbody>{fRedems.map((redemption) => (
                <Tr key={redemption.id}>
                  <Td>{redemption.coupon_id}</Td>
                  <Td>{redemption.user_id}</Td>
                  <Td>{redemption.order_id}</Td>
                  <Td>{fmtVND(redemption.discount_amount)}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(redemption.created_at)}</Td>
                </Tr>
              ))}</tbody>
            </table>
          </TableWrap>
          {!redems.length && <Empty />}
        </>)}
      </CardContent></Card>

      <Dialog open={couponOpen} onOpenChange={closeCouponDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{couponEditing ? 'Sửa mã' : 'Thêm mã'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã *" hint="Chữ in hoa, số, gạch dưới, gạch ngang">
              <Input value={couponForm.code} onChange={(e) => setCouponField('code', e.target.value.toUpperCase().replace(/\s+/g, '_'))} className="uppercase" />
            </Field>
            <Field label="Loại">
              <Select value={couponForm.type} onChange={(e) => setCouponField('type', e.target.value)}>
                {COUPON_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </Select>
            </Field>
            {couponForm.type !== 'free_shipping' && (
              <Field label="Giá trị *" hint={couponForm.type === 'percentage' ? 'Từ 0 đến 100' : 'Số tiền giảm'}>
                <Input type="number" min={0} value={couponForm.value} onChange={(e) => setCouponField('value', e.target.value === '' ? '' : Number(e.target.value))} />
              </Field>
            )}
            <Field label="Đơn tối thiểu"><Input type="number" min={0} value={couponForm.minimum_order_amount} onChange={(e) => setCouponField('minimum_order_amount', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Giảm tối đa"><Input type="number" min={0} value={couponForm.maximum_discount_amount} onChange={(e) => setCouponField('maximum_discount_amount', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Giới hạn lượt"><Input type="number" min={1} value={couponForm.usage_limit} onChange={(e) => setCouponField('usage_limit', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Lượt tối đa mỗi người"><Input type="number" min={1} value={couponForm.usage_limit_per_user} onChange={(e) => setCouponField('usage_limit_per_user', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Trạng thái">
              <Select value={couponForm.status} onChange={(e) => setCouponField('status', e.target.value)}>
                {['draft', 'active', 'inactive', 'expired'].map((status) => <option key={status} value={status}>{t('coupon', status)}</option>)}
              </Select>
            </Field>
            <Field label="Bắt đầu"><Input type="datetime-local" value={couponForm.from} onChange={(e) => setCouponField('from', e.target.value)} /></Field>
            <Field label="Kết thúc"><Input type="datetime-local" value={couponForm.to} onChange={(e) => setCouponField('to', e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={couponSaving} onClick={() => closeCouponDialog(false)}>Hủy</Button>
            <Button disabled={couponSaving} onClick={saveCoupon}>{couponSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promotionOpen} onOpenChange={closePromotionDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{promotionEditing ? 'Sửa chương trình' : 'Thêm chương trình'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên *" className="sm:col-span-2"><Input value={promotionForm.name} onChange={(e) => setPromotionField('name', e.target.value)} /></Field>
            <Field label="Mã"><Input value={promotionForm.code} onChange={(e) => setPromotionField('code', e.target.value)} /></Field>
            <Field label="Loại *">
              <Select value={promotionForm.type} onChange={(e) => setPromotionField('type', e.target.value)}>
                {PROMOTION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </Select>
            </Field>
            <Field label="Giá trị"><Input type="number" min={0} value={promotionForm.value} onChange={(e) => setPromotionField('value', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Đơn tối thiểu"><Input type="number" min={0} value={promotionForm.minimum_order_amount} onChange={(e) => setPromotionField('minimum_order_amount', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Giảm tối đa"><Input type="number" min={0} value={promotionForm.maximum_discount_amount} onChange={(e) => setPromotionField('maximum_discount_amount', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Giới hạn lượt"><Input type="number" min={1} value={promotionForm.usage_limit} onChange={(e) => setPromotionField('usage_limit', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            <Field label="Mức ưu tiên"><Input type="number" value={promotionForm.priority} onChange={(e) => setPromotionField('priority', e.target.value === '' ? 0 : Number(e.target.value))} /></Field>
            <Field label="Trạng thái">
              <Select value={promotionForm.status} onChange={(e) => setPromotionField('status', e.target.value)}>
                {['draft', 'scheduled', 'active', 'inactive', 'expired'].map((status) => <option key={status} value={status}>{t('promo', status)}</option>)}
              </Select>
            </Field>
            <Field label="Bắt đầu"><Input type="datetime-local" value={promotionForm.from} onChange={(e) => setPromotionField('from', e.target.value)} /></Field>
            <Field label="Kết thúc"><Input type="datetime-local" value={promotionForm.to} onChange={(e) => setPromotionField('to', e.target.value)} /></Field>
            <Field label="Mô tả" className="sm:col-span-2"><Textarea value={promotionForm.description} onChange={(e) => setPromotionField('description', e.target.value)} /></Field>
            <Field label="Có thể dùng cùng chương trình khác" className="sm:col-span-2">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={promotionForm.stackable} onChange={(e) => setPromotionField('stackable', e.target.checked)} />
                Cho phép cộng dồn
              </label>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={promotionSaving} onClick={() => closePromotionDialog(false)}>Hủy</Button>
            <Button disabled={promotionSaving} onClick={savePromotion}>{promotionSaving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!couponDeleteTarget}
        onOpenChange={(open) => !open && setCouponDeleteTarget(null)}
        title="Xóa mã giảm giá?"
        description={`Mã “${couponDeleteTarget?.code || ''}” sẽ bị xóa khỏi danh sách.`}
        onConfirm={deleteCoupon}
      />
      <ConfirmDialog
        open={!!couponForceDeleteTarget}
        onOpenChange={(open) => !open && setCouponForceDeleteTarget(null)}
        title="Xóa mã giảm giá đã sử dụng?"
        description={`Mã này có ${couponForceDeleteTarget?.redemptionCount || 0} lượt sử dụng. Xóa cưỡng chế sẽ xóa cả lịch sử sử dụng và không thể hoàn tác.`}
        confirmText="Xóa cưỡng chế"
        onConfirm={forceDeleteCoupon}
      />
      <ConfirmDialog
        open={!!promotionDeleteTarget}
        onOpenChange={(open) => !open && setPromotionDeleteTarget(null)}
        title="Xóa chương trình?"
        description={`Chương trình “${promotionDeleteTarget?.name || ''}” sẽ bị xóa khỏi danh sách.`}
        onConfirm={deletePromotion}
      />
      <ConfirmDialog
        open={!!promotionForceDeleteTarget}
        onOpenChange={(open) => !open && setPromotionForceDeleteTarget(null)}
        title="Xóa chương trình đã liên kết sản phẩm?"
        description={`Chương trình này còn ${promotionForceDeleteTarget?.productCount || 0} sản phẩm được liên kết. Xóa cưỡng chế sẽ gỡ toàn bộ liên kết và không thể hoàn tác.`}
        confirmText="Xóa cưỡng chế"
        onConfirm={forceDeletePromotion}
      />
    </div>
  );
}
