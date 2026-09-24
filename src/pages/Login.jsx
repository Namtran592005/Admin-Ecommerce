import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { errMsg } from '../api/client';
import { MENU } from '../components/menu';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Field } from '../components/ui/input';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user) {
      const first = MENU.find((m) =>
        user.roles?.includes('super_admin') || m.perms.some((p) => user.permissions?.includes(p)));
      nav(first ? first.key : '/orders');
    }
  }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const identifier = String(fd.get('identifier') || '').trim();
    const password = String(fd.get('password') || '');
    if (!identifier || !password) return toast.error('Nhập đủ tài khoản và mật khẩu');
    setLoading(true);
    try {
      await login(identifier, password);
      toast.success('Đăng nhập thành công');
    } catch (err) {
      toast.error(errMsg(err, 'Sai tài khoản hoặc mật khẩu'));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-col justify-center bg-gradient-to-br from-coal via-brand-700 to-brand-500 p-16 text-white md:flex md:w-[55%]">
        <Store className="mb-4 size-14" strokeWidth={1.5} />
        <h1 className="text-4xl font-bold tracking-tight">UniMate</h1>
        <h2 className="mt-1 text-xl font-normal text-white/80">Hệ thống quản trị bán hàng</h2>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <form onSubmit={submit} className="w-full max-w-[380px]">
          <h2 className="text-2xl font-semibold tracking-tight">Đăng nhập</h2>
          <div className="mt-5 grid gap-4">
            <Field label="Email / Số điện thoại">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input name="identifier" placeholder="admin@example.com" autoComplete="username" className="h-10 pl-9" />
              </div>
            </Field>
            <Field label="Mật khẩu">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input name="password" type="password" placeholder="••••••••" autoComplete="current-password" className="h-10 pl-9" />
              </div>
            </Field>
            <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
