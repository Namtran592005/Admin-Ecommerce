import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './card';
import { Button } from './button';
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
  const run = async () => {
    setRunning(true);
    try { await onConfirm(); onOpenChange(false); } finally { setRunning(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-slate-600">{description}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={running} onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            variant={tone === 'danger' ? 'destructive' : 'default'}
            disabled={running || busy}
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

export const IconButton = ({ label, onClick, children, disabled }) => (
  <Button
    size="sm"
    variant="ghost"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="h-8 w-8 p-0"
  >
    {children}
  </Button>
);
