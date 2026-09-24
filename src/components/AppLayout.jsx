import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Store, Menu as MenuIcon, X, LogOut, ChevronRight, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../auth/AuthContext';
import { MENU } from './menu';
import { roleVI } from '../utils/status';
import { Button } from './ui/button';
import { Badge } from './ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, can } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const visible = MENU.filter((m) => can(...m.perms));
  const current = MENU.find((m) => m.key === loc.pathname);

  const doLogout = async () => {
    await logout();
    toast.success('Đã đăng xuất');
    nav('/login');
  };

  if (visible.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-3 size-10 text-red-500" />
          <h1 className="text-lg font-semibold">Không có quyền quản trị</h1>
          <p className="mt-1 text-sm text-slate-500">Tài khoản khách hàng không sử dụng trang này. Vui lòng đăng nhập bằng tài khoản nhân viên.</p>
          <Button className="mt-4" onClick={doLogout}>Đăng xuất</Button>
        </div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-5 pb-5 pt-7">
        <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
          <Store className="size-5 text-white" />
        </span>
        {!collapsed && (
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-white">UniMate</div>
            <div className="text-[11px] font-medium uppercase tracking-[.06em] text-white/35">Quản trị bán hàng</div>
          </div>
        )}
      </div>
      <nav className="thin-scroll flex-1 overflow-y-auto px-2 py-3">
        {visible.map((m) => {
          const Icon = m.icon;
          const active = loc.pathname === m.key;
          return (
            <Link
              key={m.key} to={m.key} onClick={() => setMobileOpen(false)}
              title={collapsed ? m.label : undefined}
              className={cn(
                'mb-0.5 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm transition-colors',
                active ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{m.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-mist text-ink">
      {/* PC */}
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 bg-coal transition-all lg:block', collapsed ? 'w-[68px]' : 'w-60')}>
        {sidebar}
      </aside>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-coal">
            <button className="absolute right-2 top-2 rounded-md p-1.5 text-white/60 hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Đóng menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-1.5">
            <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Mở menu">
              <MenuIcon className="size-5" />
            </button>
            <button className="hidden rounded-lg p-2 hover:bg-slate-100 lg:block" onClick={() => setCollapsed(!collapsed)} aria-label="Thu gọn menu">
              <MenuIcon className="size-5" />
            </button>
            <nav className="hidden items-center gap-1 text-sm text-slate-500 sm:flex">
              <span>UniMate</span>
              <ChevronRight className="size-3.5" />
              <span className="font-medium text-slate-800">{current?.label}</span>
            </nav>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                  {(user?.email || user?.phone || '?')[0].toUpperCase()}
                </span>
                <span className="hidden max-w-[180px] truncate text-sm font-medium md:block">{user?.email || user?.phone}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate">{user?.email || user?.phone}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(user?.roles || []).map((r) => <Badge key={r} color="blue">{roleVI(r)}</Badge>)}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doLogout}><LogOut /> Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
