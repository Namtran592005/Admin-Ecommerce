# UniMate Admin — Trang Quản Trị Bán Hàng

![UniMate](public/logo-light.png)

Giao diện quản trị (dashboard) cho nhân viên vận hành shop: xem báo cáo, xử lý đơn,
quản lý kho, sản phẩm, khuyến mãi, nhân sự... trên cùng một nơi, phân quyền đến
từng nút chức năng. Chạy trên React (thư viện giao diện) + shadcn/ui (bộ linh kiện
chuẩn doanh nghiệp), chữ và ngày giờ 100% tiếng Việt.

## Tính năng theo menu

| Menu | Làm được gì | Ai thấy (quyền) |
|---|---|---|
| Tổng quan | Doanh thu, biểu đồ 7 ngày, top sản phẩm, tồn sắp hết, thao tác nhanh | Người có quyền xem báo cáo |
| Đơn hàng | Lọc, xem chi tiết (hàng/địa chỉ/lịch sử/ghi chú), duyệt chuyển trạng thái | Bộ phận đơn hàng |
| Tạo đơn | Nhân viên đặt hộ khách gọi qua điện thoại (4 bước: khách → hàng → giao nhận → chốt) | Người được duyệt đơn |
| Sản phẩm | Thêm/sửa, biến thể (màu/size/giá), ảnh xem trước + lightbox, sắp xếp, đặt ảnh chính | Quản lý hàng hóa |
| Danh mục | Danh mục, thương hiệu, thuộc tính (màu/size...) | Quản lý hàng hóa |
| Thư viện | Upload ảnh/video/tệp, xem lưới/danh sách, chọn nhiều, xóa hàng loạt, xem lớn | Quản lý hàng hóa |
| Kho hàng | Tồn đa kho, phiếu nhập/điều chỉnh/chuyển kho, lịch sử xuất nhập | Thủ kho |
| Thanh toán | Đối soát thu tiền, hoàn tiền, phương thức (COD/ví...) | Kế toán |
| Vận chuyển | Vận đơn, hành trình, hình thức + phí ship | Bộ phận giao hàng |
| Khuyến mãi | Mã giảm giá, chương trình sale, lượt đã dùng | Marketing |
| Người dùng | Tab Khách hàng / Nhân sự riêng, thêm nhân sự + gán vai trò, xem bảng quyền | Quản trị nhân sự |
| Đánh giá & Đổi trả | Duyệt đánh giá sao, xử lý yêu cầu trả hàng | CSKH |
| Hóa đơn & Dòng tiền | Xuất hóa đơn VAT, ghi thu/chi | Kế toán |
| Marketing | Chiến dịch, banner, soạn + gửi email HTML hàng loạt qua SMTP | Marketing |
| Hệ thống | Cấu hình, thông báo, nhật ký thao tác (ai làm gì, khi nào) | Quản trị hệ thống |

Tài khoản khách hàng đăng nhập nhầm vào đây sẽ thấy trang từ chối 403.

## Chạy
```powershell
npm install
Copy-Item .env.example .env   # sửa VITE_API_BASE nếu API ở máy khác
npm run dev                   # mở http://localhost:5173
npm run build                 # đóng gói thư mục dist/ để đưa lên hosting tĩnh
```
Mặc định gọi API Docker local (`http://127.0.0.1/api`).
Đăng nhập: `admin@example.com` / `Admin123!`.

Triển khai cùng stack Docker có sẵn (`ADMIN_DOMAIN`, xem `backend/docs/DOCKER.md`).

## Trải nghiệm
- Responsive đầy đủ: PC sidebar cố định, tablet/mobile sidebar trượt + bảng cuộn ngang.
- Dữ liệu tự làm mới sau mỗi thao tác + tự cập nhật nền 30–60s (đơn, kho, thanh toán...).
- Mọi dialog đều độc lập: đóng cái trên không sập cái dưới; lỗi trang không trắng cả app.

## Cấu trúc (cho dev bảo trì)
```
src/
├── api/client.js      # gọi API: tự gắn token, tự làm mới phiên khi hết hạn, định dạng tiền/ngày
├── auth/              # đăng nhập/đăng xuất, khôi phục phiên khi F5, kiểm tra quyền can(...)
├── lib/ + components/ui/  # linh kiện shadcn: nút, thẻ, bảng, dialog, form...
├── components/        # menu (quyền từng mục), khung layout, chọn nhanh (hàng/đơn/ảnh), lightbox
├── utils/status.js    # từ điển trạng thái + vai trò tiếng Việt
├── pages/             # 16 trang, mỗi trang 1 file theo đúng menu ở trên
└── App.jsx            # điều hướng + chặn quyền (thiếu quyền → 403)
```
Thêm mục menu mới = thêm 1 dòng vào `MENU` (`components/menu.jsx`) + 1 route trong
`App.jsx` + 1 file trong `pages/`. Backend API xem tại `backend/docs/API.md`.
