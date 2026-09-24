import { cn } from '../../lib/utils';

export const TableWrap = ({ className, children }) => (
  <div className={cn('overflow-x-auto rounded-lg border border-slate-200', className)}>
    {children}
  </div>
);
export const THead = ({ children }) => (
  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">{children}</thead>
);
export const Tr = ({ className, ...props }) => (
  <tr className={cn('border-t border-slate-100 first:border-t-0 hover:bg-slate-50/60', className)} {...props} />
);
export const Th = ({ className, ...props }) => (
  <th className={cn('px-3 py-2.5 font-medium', className)} {...props} />
);
export const Td = ({ className, ...props }) => (
  <td className={cn('px-3 py-2.5 align-middle', className)} {...props} />
);

export const Pagination = ({ page, limit, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 15)));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm text-slate-600">
      <span>Tổng {total || 0} · Trang {page}/{totalPages}</span>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm disabled:opacity-40"
          disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Trước
        </button>
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm disabled:opacity-40"
          disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Sau →
        </button>
      </div>
    </div>
  );
};

export const Empty = ({ text = 'Chưa có dữ liệu' }) => (
  <div className="py-8 text-center text-sm text-slate-400">{text}</div>
);

export const PageHeader = ({ title, actions }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
    <div className="flex flex-wrap gap-2">{actions}</div>
  </div>
);

export const Toolbar = ({ children }) => (
  <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>
);
