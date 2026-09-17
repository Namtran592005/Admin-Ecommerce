import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, message, Button, Space } from 'antd';
import { ShoppingOutlined, DollarOutlined, WarningOutlined, PhoneOutlined, PlusOutlined, GiftOutlined, StockOutlined, RiseOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api, errMsg, fmtVND, fmtDate } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { t } from '../utils/status';

const dayKey = (d) => d.toISOString().slice(0, 10);

export default function Dashboard() {
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [bars, setBars] = useState([]);

  const refresh = (quiet = false) => {
    api.get('/reports/summary').then((r) => setData(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); });
    if (can('orders.read')) {
      api.get('/orders', { params: { page: 1, limit: 100 } }).then((r) => {
        const rows = r.data.data || [];
        setRecent(rows.slice(0, 5));
        const map = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          map[dayKey(d)] = { label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), total: 0 };
        }
        rows.forEach((o) => {
          const k = dayKey(new Date(o.created_at));
          if (map[k] && o.status !== 'cancelled') map[k].total += Number(o.total_amount || 0);
        });
        setBars(Object.values(map));
      }).catch(() => {});
    }
  };
  useEffect(() => {
    refresh();
    const id = setInterval(() => { if (document.visibilityState === 'visible') refresh(true); }, 60000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <Spin />;
  const { all_time, today, top_products, low_stock, by_payment } = data;
  const maxBar = Math.max(1, ...bars.map((b) => b.total));

  const stat = (title, value, icon, bg) => (
    <Card className="stat-card" styles={{ body: { padding: 16 } }}>
      <span className="stat-icon" style={{ background: bg }}>{icon}</span>
      <Statistic title={title} value={value} />
    </Card>
  );

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Tổng quan kinh doanh</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>{stat('Doanh thu (chưa hủy)', fmtVND(all_time.revenue), <DollarOutlined style={{ color: '#15803d' }} />, '#dcfce7')}</Col>
        <Col xs={24} sm={12} lg={6}>{stat('Tổng đơn hàng', all_time.total_orders, <ShoppingOutlined style={{ color: '#0f4c81' }} />, '#dbeafe')}</Col>
        <Col xs={24} sm={12} lg={6}>{stat('Đơn hôm nay', today.n, <RiseOutlined style={{ color: '#b45309' }} />, '#fef3c7')}</Col>
        <Col xs={24} sm={12} lg={6}>{stat('Doanh thu hôm nay', fmtVND(today.revenue), <DollarOutlined style={{ color: '#7c3aed' }} />, '#ede9fe')}</Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Doanh thu 7 ngày gần nhất" styles={{ body: { paddingTop: 4 } }}>
            {bars.length ? (
              <div className="mini-bars">
                {bars.map((b) => (
                  <div className="mini-bar" key={b.label}>
                    <span className="val">{b.total >= 1000 ? (b.total / 1000).toFixed(0) + 'k' : b.total}</span>
                    <div className="col" style={{ height: Math.max(4, (b.total / maxBar) * 100) }} />
                    <span className="lbl">{b.label}</span>
                  </div>
                ))}
              </div>
            ) : <Typography.Text type="secondary">Không có quyền xem đơn hàng.</Typography.Text>}
          </Card>
          <Card title="Đơn mới nhất" style={{ marginTop: 16 }}>
            <Table size="small" pagination={false} dataSource={recent} rowKey="id" columns={[
              { title: 'Mã đơn', dataIndex: 'order_number' },
              { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag>{t('order', v)}</Tag> },
              { title: 'Tổng', dataIndex: 'total_amount', render: fmtVND },
              { title: 'Ngày', dataIndex: 'created_at', render: fmtDate },
            ]} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Thao tác nhanh">
            <Space wrap>
              {can('orders.write') && <Link to="/pos"><Button type="primary" icon={<PhoneOutlined />}>Tạo đơn hộ</Button></Link>}
              {can('products.write') && <Link to="/products"><Button icon={<PlusOutlined />}>Thêm sản phẩm</Button></Link>}
              {can('promotions.write') && <Link to="/promotions"><Button icon={<GiftOutlined />}>Tạo coupon</Button></Link>}
              {can('inventory.write') && <Link to="/inventory"><Button icon={<StockOutlined />}>Nhập tồn</Button></Link>}
            </Space>
          </Card>
          <Card title={<span><WarningOutlined /> Tồn kho sắp hết</span>} style={{ marginTop: 16 }}>
            <Table size="small" pagination={false} dataSource={low_stock} rowKey={(r) => r.warehouse_id + '-' + r.variant_id} columns={[
              { title: 'Kho', dataIndex: 'warehouse_id' },
              { title: 'Biến thể', dataIndex: 'variant_id' },
              { title: 'Khả dụng', dataIndex: 'available_quantity' },
            ]} />
          </Card>
          <Card title="Sản phẩm bán chạy" style={{ marginTop: 16 }}>
            <Table size="small" pagination={false} dataSource={top_products} rowKey="product_id" columns={[
              { title: 'Sản phẩm', dataIndex: 'name' },
              { title: 'SL', dataIndex: 'qty' },
              { title: 'Doanh thu', dataIndex: 'revenue', render: fmtVND },
            ]} />
          </Card>
          <Card title="Đơn theo thanh toán" style={{ marginTop: 16 }}>
            {(by_payment || []).map((p) => <Tag key={p.payment_status} style={{ margin: 4 }}>{t('pay', p.payment_status)}: {p.n}</Tag>)}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
