# UniMate Admin — Trang quản trị bán hàng

React 19 + Vite 6 + Ant Design 5 (tiếng Việt `viVN`, icon Ant Design),
React Router 7, axios (tự refresh token). Chạy dev: `npm run dev` → http://localhost:5173.

## Chạy
```powershell
npm install
Copy-Item .env.example .env   # sửa VITE_API_BASE nếu backend ở chỗ khác
npm run dev                   # dev
npm run build                 # build ra dist/ để deploy tĩnh
```
Mặc định gọi backend Docker local: `VITE_API_BASE=http://127.0.0.1/api`
(backend đã cho phép origin `http://localhost:5173` trong CORS).
Login: `admin@unimate.vn` / `Admin123!`.

## Triển khai Docker
Nằm trong compose của backend (`backend/docker-compose.yml`, service `admin`):
build SPA với `ADMIN_API_BASE` rồi phục vụ qua nginx, ra ngoài bằng Caddy
(`ADMIN_DOMAIN`, xem `backend/docs/DOCKER.md`). Test nội bộ: http://127.0.0.1:8080.

## Phân quyền hiển thị (đúng DB)
Menu + route guard đọc `roles[]`/`permissions[]` từ `GET /api/auth/me`
(`super_admin` thấy hết). Bảng menu ở `src/components/menu.js`:

| Menu | Quyền cần (có 1 là hiện) |
|---|---|
| Tổng quan | `reports.read` |
| Đơn hàng | `orders.read` |
| Tạo đơn hộ (nhân viên đặt giúp khách qua SĐT) | `orders.write` |
| Sản phẩm | `products.read` |
| Danh mục & Thương hiệu | `categories.write` |
| Thư viện ảnh | `products.write` |
| Kho hàng | `inventory.read` |
| Thanh toán | `payments.read` |
| Vận chuyển | `shipping.read` |
| Khuyến mãi | `promotions.read` |
| Người dùng & Phân quyền | `users.read` |
| Đánh giá & Đổi trả | `returns.read` |
| Hóa đơn & Dòng tiền | `payments.read` |
| Marketing | `promotions.read` |
| Hệ thống | `settings.write` |

Vào URL trực tiếp mà thiếu quyền → trang 403.

## Cấu trúc (để bảo trì)
```
src/
├── api/client.js      # axios: baseURL, Bearer RAM, tự refresh 401
│                      # (gửi refresh_token trong body nếu cookie bị chặn), fmtVND/fmtDate/errMsg
├── auth/AuthContext.jsx  # login/logout/me, can(...quyền)
├── utils/status.js    # từ điển trạng thái tiếng Việt (t/order/pay/ship/...) + opts()
├── components/        # menu.jsx (menu+quyền), AppLayout.jsx (khung), pickers.jsx
│                      # (VariantPicker, OrderPicker, MediaPicker)
├── pages/             # Login, Dashboard, Orders, OrderCreate (tạo đơn hộ),
│                      # Products, Catalog, Media, Inventory, Payments, Shipping,
│                      # Promotions, Users, Reviews, Finance, Marketing (+gửi email), System
├── App.jsx            # router + guard RequireAuth/RequirePerm
└── main.jsx           # ConfigProvider viVN + theme doanh nghiệp
```
Quy ước: mỗi trang tự load dữ liệu bằng `api`, toast `message` mọi thao tác,
dữ liệu tự làm mới sau ghi + tự poll 30–60s (Orders, Kho, Thanh toán, Dashboard...),
nút ghi chỉ render khi `can('...write')`. Trạng thái luôn hiển thị tiếng Việt
qua `t(nhóm, mã)`. Form modal chia 2–3 cột, chọn liệu từ dropdown/search thay vì gõ tay ID.
Giao diện: theme doanh nghiệp (xanh navy) trong `main.jsx`, responsive mobile/tablet
(sider tự thu, bảng cuộn ngang), toàn bộ tiếng Việt (kể cả nút dialog).
Tài khoản khách hàng (role `customer`) bị chặn ngay cổng vào.
Thêm menu mới: thêm 1 dòng vào `MENU` + 1 route trong `App.jsx` + 1 file trang.
