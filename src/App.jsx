import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { ROUTE_PERMS } from './components/menu';
import { useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderCreate from './pages/OrderCreate';
import Products from './pages/Products';
import Catalog from './pages/Catalog';
import Media from './pages/Media';
import Inventory from './pages/Inventory';
import Payments from './pages/Payments';
import Shipping from './pages/Shipping';
import Promotions from './pages/Promotions';
import Users from './pages/Users';
import Reviews from './pages/Reviews';
import Finance from './pages/Finance';
import Marketing from './pages/Marketing';
import System from './pages/System';

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

function RequirePerm({ path, children }) {
  const { can } = useAuth();
  if (!can(...(ROUTE_PERMS[path] || []))) {
    return <Result status="403" title="403" subTitle="Bạn không có quyền xem trang này"
      extra={<Button type="primary"><Link to="/">Về trang chủ</Link></Button>} />;
  }
  return children;
}

const guard = (path, el) => <RequirePerm path={path}>{el}</RequirePerm>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={guard('/', <Dashboard />)} />
          <Route path="orders" element={guard('/orders', <Orders />)} />
          <Route path="pos" element={guard('/pos', <OrderCreate />)} />
          <Route path="products" element={guard('/products', <Products />)} />
          <Route path="catalog" element={guard('/catalog', <Catalog />)} />
          <Route path="media" element={guard('/media', <Media />)} />
          <Route path="inventory" element={guard('/inventory', <Inventory />)} />
          <Route path="payments" element={guard('/payments', <Payments />)} />
          <Route path="shipping" element={guard('/shipping', <Shipping />)} />
          <Route path="promotions" element={guard('/promotions', <Promotions />)} />
          <Route path="users" element={guard('/users', <Users />)} />
          <Route path="reviews" element={guard('/reviews', <Reviews />)} />
          <Route path="finance" element={guard('/finance', <Finance />)} />
          <Route path="marketing" element={guard('/marketing', <Marketing />)} />
          <Route path="system" element={guard('/system', <System />)} />
        </Route>
        <Route path="*" element={<Result status="404" title="404" subTitle="Không tìm thấy trang" />} />
      </Routes>
    </BrowserRouter>
  );
}
