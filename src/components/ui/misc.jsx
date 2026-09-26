import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from './card';
import { Button } from './button';
import { Input } from './input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { t } from '../../utils/status';

const COLOR = {
  order: { pending: 'default', confirmed: 'blue', processing: 'cyan', packed: 'geekblue', shipping: 'orange', delivered: 'green', completed: 'green', cancelled: 'red', returned: 'volcano', refunded: 'purple' },
  payment: { pending: 'default', processing: 'blue', paid: 'green', failed: 'red', cancelled: 'default', refunded: 'purple', partially_refunded: 'gold' },
  pay: { unpaid: 'orange', pending: 'default', paid: 'green', partially_refunded: 'gold', refunded: 'purple', failed: 'red' },
  ship: { delivered: 'green', failed: 'red', cancelled: 'default', returned: 'volcano' },
  product: { active: 'green', draft: 'default', inactive: 'orange', archived: 'default' },
  user: { active: 'green', pending: 'gold', inactive: 'orange', suspended: 'red', deleted: 'default' },
  coupon: { active: 'green', draft: 'default', inactive: 'default', expired: 'red' },
};

export const StatusBadge = ({ group, value, className }) => (
  <Badge color={COLOR[group]?.[value] || (value ? 'blue' : 'default')} className={cn(className)}>
    {t(group, value)}
  </Badge>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
    {tabs.map((tb) => (
      <button
        key={tb.key}
        onClick={() => onChange(tb.key)}
        className={cn(
          'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
          active === tb.key
            ? 'border-brand-500 text-brand-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        )}
      >
        {tb.label}
      </button>
    ))}
  </div>
);

export const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-slate-100', className)} />
);

/**
 * Ô tìm kiếm cho bảng dữ liệu dài. Lọc ngay trên máy nên không phải chờ
 * gọi API, và có nút X để xoá nhanh.
 */
export const TableSearch = ({ value, onChange, placeholder = 'Tìm kiếm...', className = 'w-full max-w-[240px]' }) => (
  <span className={cn('relative block', className)}>
    <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="pr-8 pl-8"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Xoá tìm kiếm"
        className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="size-3.5" />
      </button>
    )}
  </span>
);

/**
 * Lọc danh sách theo từ khoá. `fields` là mảng tên cột cần so khớp, hoặc một
 * hàm tự trả về chuỗi để so (dùng khi dữ liệu nằm trong object con).
 */
export function useRowFilter(rows, q, fields) {
  const key = typeof fields === 'function' ? fields.toString() : [...fields].join('|');
  return React.useMemo(() => {
    const list = rows || [];
    const s = (q || '').trim().toLowerCase();
    if (!s) return list;
    const keys = typeof fields === 'function' ? null : fields;
    return list.filter((r) => {
      if (keys) return keys.some((k) => {
        const v = r[k];
        return v != null && String(v).toLowerCase().includes(s);
      });
      const text = fields(r);
      return text != null && String(text).toLowerCase().includes(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, key]);
}

export const ConfirmButton = ({ title, onConfirm, children, ...props }) => {
  const [ask, setAsk] = React.useState(false);
  if (!ask) return <Button onClick={() => setAsk(true)} {...props}>{children}</Button>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      {title}
      <Button size="sm" variant="destructive" onClick={() => { setAsk(false); onConfirm(); }}>Đồng ý</Button>
      <Button size="sm" variant="outline" onClick={() => setAsk(false)}>Hủy</Button>
    </span>
  );
};

export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmText = 'Xóa', onConfirm, busy, tone = 'danger' }) => {
  const [running, setRunning] = React.useState(false);
  const busyNow = running || busy;
  React.useEffect(() => { if (open) setRunning(false); }, [open]);
  const run = async () => {
    if (busyNow) return;
    setRunning(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      /* onConfirm tự hiển thị lỗi; giữ modal mở để người dùng thử lại */
    } finally {
      setRunning(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busyNow && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-slate-600">{description}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={busyNow} onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            variant={tone === 'danger' ? 'destructive' : 'default'}
            disabled={busyNow}
            onClick={run}
          >
            {running ? 'Đang xử lý...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const RowActions = ({ children }) => (
  <div className="flex items-center justify-end gap-1">{children}</div>
);

export const IconButton = ({ label, onClick, children, disabled, variant = 'ghost', className, ...rest }) => (
  <Button
    size="sm"
    variant={variant}
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={cn('h-8 w-8 p-0', className)}
    {...rest}
  >
    {children}
  </Button>
);
