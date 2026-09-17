import { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Tag, Avatar, Breadcrumb, Result, message } from 'antd';
import { LogoutOutlined, ShopOutlined, UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MENU } from './menu';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, can } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const visible = MENU.filter((m) => can(...m.perms));
  const items = visible.map((m) => ({
    key: m.key, icon: m.icon, label: <Link to={m.key}>{m.label}</Link>,
  }));
  const current = MENU.find((m) => m.key === loc.pathname);

  const doLogout = async () => {
    await logout();
    message.success('Đã đăng xuất');
    nav('/login');
  };

  // Trang quản trị chỉ dành cho nhân sự — tài khoản khách (không quyền nào) bị chặn
  if (visible.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Result status="403" title="Không có quyền quản trị"
          subTitle="Tài khoản khách hàng không sử dụng trang này. Vui lòng đăng nhập bằng tài khoản nhân viên."
          extra={<Button type="primary" onClick={doLogout}>Đăng xuất</Button>} />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg" collapsedWidth={0} width={250}
        collapsed={collapsed} onCollapse={setCollapsed}
        trigger={null} className="app-sider"
      >
        <div className="brand">
          <Avatar icon={<ShopOutlined />} style={{ background: 'rgba(255,255,255,.12)' }} />
          {!collapsed && (
            <div>
              <Typography.Text strong style={{ color: '#fff', fontSize: 15, letterSpacing: '-.01em' }}>UniMate</Typography.Text>
              <div className="sub">Quản trị bán hàng</div>
            </div>
          )}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[loc.pathname]} items={items} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)} aria-label="Đóng/mở menu" />
            <Breadcrumb items={[{ title: 'UniMate' }, ...(current ? [{ title: current.label }] : [])]} />
          </Space>
          <Space wrap>
            <Avatar size="small" icon={<UserOutlined />} style={{ background: '#0f4c81' }} />
            <Typography.Text strong className="hide-mobile">{user?.email || user?.phone}</Typography.Text>
            <span className="hide-mobile">{(user?.roles || []).map((r) => <Tag key={r} color="blue">{r}</Tag>)}</span>
            <Button icon={<LogoutOutlined />} onClick={doLogout}>Đăng xuất</Button>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
