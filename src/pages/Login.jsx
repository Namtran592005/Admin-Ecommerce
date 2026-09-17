import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Typography, message } from 'antd';
import { LockOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errMsg } from '../api/client';
import { MENU } from '../components/menu';

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

  const submit = async (v) => {
    setLoading(true);
    try {
      await login(v.identifier.trim(), v.password);
      message.success('Đăng nhập thành công');
    } catch (e) {
      message.error(errMsg(e, 'Sai tài khoản hoặc mật khẩu'));
    } finally { setLoading(false); }
  };

  return (
    <Row style={{ minHeight: '100vh' }}>
      <Col xs={0} md={14} style={{
        background: 'linear-gradient(135deg, #0a2240 0%, #0f4c81 60%, #2f7fd0 100%)',
        color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 64,
      }}>
        <ShopOutlined style={{ fontSize: 56, marginBottom: 16 }} />
        <Typography.Title style={{ color: '#fff', margin: 0 }}>UniMate</Typography.Title>
        <Typography.Title level={3} style={{ color: 'rgba(255,255,255,.85)', fontWeight: 400 }}>
          Hệ thống quản trị bán hàng
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(255,255,255,.65)', fontSize: 16, maxWidth: 480 }}>
          Đơn hàng · Kho · Thanh toán · Khuyến mãi · Báo cáo —
          phân quyền chi tiết đến từng chức năng cho từng vị trí nhân sự.
        </Typography.Paragraph>
      </Col>
      <Col xs={24} md={10} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 24 }}>
        <Card bordered={false} style={{ width: 380, maxWidth: '100%' }}>
          <Typography.Title level={3}>Đăng nhập quản trị</Typography.Title>
          <Typography.Text type="secondary">Dành cho nhân viên (tài khoản khách hàng không dùng được trang này).</Typography.Text>
          <Form layout="vertical" onFinish={submit} style={{ marginTop: 16 }}>
            <Form.Item name="identifier" label="Email / Số điện thoại" rules={[{ required: true, message: 'Nhập tài khoản' }]}>
              <Input prefix={<UserOutlined />} placeholder="admin@unimate.vn" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">Đăng nhập</Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
