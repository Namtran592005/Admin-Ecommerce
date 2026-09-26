import { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input, Field } from '../components/ui/input';

export default function ForcePasswordChange() {
  const { user, changePassword, logout } = useAuth();
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.old_password) return setError('Nhập mật khẩu hiện tại.');
    if (form.new_password.length < 8) return setError('Mật khẩu mới tối thiểu 8 ký tự.');
    if (form.new_password === form.old_password) return setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    if (form.new_password !== form.confirm) return setError('Xác nhận mật khẩu không khớp.');
    setSaving(true);
    try {
      await changePassword(form.old_password, form.new_password);
      toast.success('Đổi mật khẩu thành công');
    } catch (err) {
      setError(err?.response?.data?.error || 'Đổi mật khẩu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Đổi mật khẩu</h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Tài khoản <span className="font-medium">{user?.email || user?.phone}</span> đang dùng mật khẩu tạm thời.
              Hãy đặt mật khẩu riêng trước khi tiếp tục.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Mật khẩu hiện tại *">
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={form.old_password}
              onChange={(e) => set('old_password', e.target.value)}
            />
          </Field>
          <Field label="Mật khẩu mới *" hint="Tối thiểu 8 ký tự">
            <Input
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={(e) => set('new_password', e.target.value)}
            />
          </Field>
          <Field label="Xác nhận mật khẩu mới *">
            <Input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <Button type="submit" disabled={saving} className="mt-1 w-full">
            <KeyRound />{saving ? 'Đang lưu...' : 'Đổi mật khẩu và tiếp tục'}
          </Button>
          <Button type="button" variant="outline" onClick={logout} className="w-full">
            Đăng xuất
          </Button>
        </form>
      </div>
    </div>
  );
}
