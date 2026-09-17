import {
  DashboardOutlined, ShoppingCartOutlined, PhoneOutlined, AppstoreOutlined, TagsOutlined,
  PictureOutlined, StockOutlined, CreditCardOutlined, TruckOutlined,
  GiftOutlined, TeamOutlined, StarOutlined, WalletOutlined,
  NotificationOutlined, SettingOutlined,
} from '@ant-design/icons';

// perms: hiện menu nếu user có BẤT KỲ quyền nào (super_admin thấy hết)
export const MENU = [
  { key: '/', label: 'Tổng quan', icon: <DashboardOutlined />, perms: ['reports.read'] },
  { key: '/orders', label: 'Đơn hàng', icon: <ShoppingCartOutlined />, perms: ['orders.read'] },
  { key: '/pos', label: 'Tạo đơn hộ', icon: <PhoneOutlined />, perms: ['orders.write'] },
  { key: '/products', label: 'Sản phẩm', icon: <AppstoreOutlined />, perms: ['products.read', 'products.write'] },
  { key: '/catalog', label: 'Danh mục & Thương hiệu', icon: <TagsOutlined />, perms: ['categories.write', 'products.write'] },
  { key: '/media', label: 'Thư viện ảnh', icon: <PictureOutlined />, perms: ['products.write'] },
  { key: '/inventory', label: 'Kho hàng', icon: <StockOutlined />, perms: ['inventory.read'] },
  { key: '/payments', label: 'Thanh toán', icon: <CreditCardOutlined />, perms: ['payments.read'] },
  { key: '/shipping', label: 'Vận chuyển', icon: <TruckOutlined />, perms: ['shipping.read'] },
  { key: '/promotions', label: 'Khuyến mãi', icon: <GiftOutlined />, perms: ['promotions.read'] },
  { key: '/users', label: 'Người dùng & Phân quyền', icon: <TeamOutlined />, perms: ['users.read'] },
  { key: '/reviews', label: 'Đánh giá & Đổi trả', icon: <StarOutlined />, perms: ['returns.read', 'reviews.write'] },
  { key: '/finance', label: 'Hóa đơn & Dòng tiền', icon: <WalletOutlined />, perms: ['payments.read', 'reports.read'] },
  { key: '/marketing', label: 'Marketing', icon: <NotificationOutlined />, perms: ['promotions.read'] },
  { key: '/system', label: 'Hệ thống', icon: <SettingOutlined />, perms: ['settings.write', 'audit.read'] },
];

// Map route -> quyền tối thiểu để vào trực tiếp bằng URL
export const ROUTE_PERMS = Object.fromEntries(MENU.map((m) => [m.key, m.perms]));
