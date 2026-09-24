import {
  LayoutDashboard, ShoppingCart, Phone, Package, Tags, Image as ImageIcon,
  Warehouse, CreditCard, Truck, Gift, Users, Star, Wallet, Megaphone, Settings,
} from 'lucide-react';

// perms: hiện menu nếu user có BẤT KỲ quyền nào (super_admin thấy hết)
export const MENU = [
  { key: '/', label: 'Tổng quan', icon: LayoutDashboard, perms: ['reports.read'] },
  { key: '/orders', label: 'Đơn hàng', icon: ShoppingCart, perms: ['orders.read'] },
  { key: '/pos', label: 'Tạo đơn', icon: Phone, perms: ['orders.write'] },
  { key: '/products', label: 'Sản phẩm', icon: Package, perms: ['products.read', 'products.write'] },
  { key: '/catalog', label: 'Danh mục', icon: Tags, perms: ['categories.write', 'products.write'] },
  { key: '/media', label: 'Thư viện', icon: ImageIcon, perms: ['products.write'] },
  { key: '/inventory', label: 'Kho hàng', icon: Warehouse, perms: ['inventory.read'] },
  { key: '/payments', label: 'Thanh toán', icon: CreditCard, perms: ['payments.read'] },
  { key: '/shipping', label: 'Vận chuyển', icon: Truck, perms: ['shipping.read'] },
  { key: '/promotions', label: 'Khuyến mãi', icon: Gift, perms: ['promotions.read'] },
  { key: '/users', label: 'Người dùng', icon: Users, perms: ['users.read'] },
  { key: '/reviews', label: 'Đánh giá & Đổi trả', icon: Star, perms: ['returns.read', 'reviews.write'] },
  { key: '/finance', label: 'Hóa đơn & Dòng tiền', icon: Wallet, perms: ['payments.read', 'reports.read'] },
  { key: '/marketing', label: 'Marketing', icon: Megaphone, perms: ['promotions.read'] },
  { key: '/system', label: 'Hệ thống', icon: Settings, perms: ['settings.write', 'audit.read'] },
];

export const ROUTE_PERMS = Object.fromEntries(MENU.map((m) => [m.key, m.perms]));
