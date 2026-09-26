# UniMate Admin — Trang quản trị

React 19 + Vite + Tailwind 4. Giao diện vận hành cho nhân viên shop: đơn hàng, kho,
sản phẩm, khuyến mãi, nhân sự. Phân quyền đến từng menu và từng nút bấm.

Chạy kèm backend ([../backend](../backend)) và web bán hàng ([../client](../client))
trong cùng một stack Docker.

## Chạy

Cách nhanh nhất — dựng cả stack (xem [`../backend/README.md`](../backend/README.md)):

```powershell
cd ..\backend
docker compose --env-file .env.docker up -d --build
```

Mở <http://127.0.0.1:8080>, đăng nhập `admin@example.com` / `Admin@123`. Lần đầu hệ
thống bắt buộc đổi mật khẩu trước khi vào được trang quản trị.

Chạy riêng để phát triển:

```powershell
npm install
Copy-Item .env.example .env    # sửa VITE_API_BASE nếu API ở máy khác
npm run dev                    # http://localhost:5173
npm run build                  # đóng gói dist/ để đưa lên hosting tĩnh
```

| Biến môi trường | Ý nghĩa |
|---|---|
| `VITE_API_BASE` | Địa chỉ API, kèm `/api` |
| `VITE_FILES_BASE` | URL công khai của file media (khớp `S3_PUBLIC_URL` backend) |

Đổi 2 biến này trong `.env.docker` (`ADMIN_API_BASE`, `ADMIN_FILES_BASE`) thì phải
build lại image — biến được nướng vào lúc build.

## Menu

| Menu | Làm được gì |
|---|---|
| Tổng quan | Doanh thu, biểu đồ 7 ngày, top sản phẩm, tồn sắp hết |
| Đơn hàng | Lọc, xem chi tiết, chuyển trạng thái, ghi chú |
| Tạo đơn | Nhân viên đặt hộ khách gọi điện: khách → hàng → giao nhận → chốt |
| Sản phẩm | Thêm/sửa, biến thể (màu/size/giá), ảnh, ẩn hiện, xoá mềm hoặc xoá vĩnh viễn |
| Danh mục | Danh mục, thương hiệu, thuộc tính + giá trị — thêm/sửa/xoá/bật tắt |
| Thư viện | Upload ảnh/video/tệp, xem lưới hoặc danh sách, chọn nhiều, xoá hàng loạt |
| Kho hàng | Tồn đa kho, phiếu nhập/điều chỉnh/chuyển kho, lịch sử xuất nhập |
| Thanh toán | Đối soát, hoàn tiền, quản lý phương thức thanh toán |
| Vận chuyển | Vận đơn, hành trình, quản lý hình thức giao và phí ship |
| Khuyến mãi | Mã giảm giá và chương trình sale, xem lượt đã dùng |
| Người dùng | Tách riêng khách hàng và nhân sự, gán/gỡ vai trò, khoá tài khoản, **đặt lại mật khẩu** (tự sinh mật khẩu ngẫu nhiên, thu hồi phiên cũ, bắt đổi khi đăng nhập lại) |
| Đánh giá & Đổi trả | Duyệt đánh giá, xử lý yêu cầu trả hàng |
| Hóa đơn & Dòng tiền | Xuất hóa đơn VAT, ghi thu chi |
| Marketing | Chiến dịch (thêm/sửa/xoá/bật tắt), banner (thêm/sửa/xoá/bật tắt, đổi thứ tự, ảnh riêng cho mobile), soạn và gửi email HTML hàng loạt |
| Hệ thống | Cấu hình, thông báo, nhật ký thao tác |

Tài khoản khách hàng đăng nhập nhầm vào đây sẽ thấy trang 403.

## Cấu trúc

```
src/
├── api/client.js       gắn token, tự làm mới phiên khi hết hạn, định dạng tiền/ngày
├── auth/               đăng nhập/đăng xuất, khôi phục phiên khi F5, hàm can(quyền)
├── components/
│   ├── menu.jsx        danh sách menu kèm quyền đi kèm
│   ├── ui/             nút, thẻ, bảng, dialog, form, ô nhập, ConfirmDialog
│   ├── pickers.jsx     chọn nhanh hàng / đơn / ảnh trong thư viện
│   └── Lightbox.jsx    xem ảnh cỡ lớn
├── pages/              16 trang, mỗi menu 1 file
└── App.jsx             điều hướng + chặn quyền (thiếu quyền → 403)
```

Thêm menu mới = thêm 1 dòng vào `MENU` (`components/menu.jsx`) + 1 route trong `App.jsx`
+ 1 file trong `pages/`. Danh sách endpoint: [`../backend/docs/API.md`](../backend/docs/API.md).

## Ghi chú cho dev

- Mọi thao tác xoá đều hỏi lại bằng hộp thoại xác nhận. Nếu dữ liệu đang được dùng ở
  nơi khác, API trả `409` kèm `can_force` và giao diện hỏi thêm một lần nữa.
- Nút bật/tắt nhanh (con mắt) cho danh mục, thương hiệu, sản phẩm, kho, phương thức
  thanh toán, hình thức giao, mã giảm giá và chương trình khuyến mãi.
- Dữ liệu tự làm mới sau mỗi thao tác, và tự cập nhật nền 30–60 giây.
- Responsive: PC sidebar cố định, tablet/mobile sidebar trượt, bảng cuộn ngang.
