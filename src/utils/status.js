// Từ điển trạng thái tiếng Việt cho toàn bộ admin
export const VI = {
  order: { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý', packed: 'Đã đóng gói', shipping: 'Đang giao', delivered: 'Đã giao', completed: 'Hoàn tất', cancelled: 'Đã hủy', returned: 'Đã trả hàng', refunded: 'Đã hoàn tiền' },
  pay: { unpaid: 'Chưa thanh toán', pending: 'Chờ', paid: 'Đã thanh toán', partially_refunded: 'Hoàn một phần', refunded: 'Đã hoàn tiền', failed: 'Thất bại' },
  payment: { pending: 'Chờ', processing: 'Đang xử lý', paid: 'Đã thu', failed: 'Thất bại', cancelled: 'Đã hủy', refunded: 'Đã hoàn tiền', partially_refunded: 'Hoàn một phần' },
  ship: { pending: 'Chờ lấy hàng', ready: 'Sẵn sàng', picked_up: 'Đã lấy hàng', in_transit: 'Đang vận chuyển', out_for_delivery: 'Đang giao', delivered: 'Đã giao', failed: 'Giao thất bại', returned: 'Hoàn về', cancelled: 'Đã hủy' },
  product: { draft: 'Nháp', active: 'Đang bán', inactive: 'Tạm ẩn', archived: 'Lưu trữ' },
  variant: { active: 'Đang bán', inactive: 'Ngừng bán' },
  user: { pending: 'Chờ duyệt', active: 'Hoạt động', inactive: 'Tạm khóa', suspended: 'Đình chỉ', deleted: 'Đã xóa' },
  refund: { requested: 'Chờ duyệt', approved: 'Đã duyệt', processing: 'Đang xử lý', completed: 'Hoàn tất', failed: 'Thất bại', cancelled: 'Đã hủy' },
  ret: { requested: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', customer_shipping: 'Khách đang gửi', received: 'Đã nhận hàng', inspecting: 'Đang kiểm tra', accepted: 'Chấp nhận', partially_accepted: 'Chấp nhận một phần', refunded: 'Đã hoàn tiền', cancelled: 'Đã hủy' },
  review: { pending: 'Chờ duyệt', published: 'Đã duyệt', hidden: 'Đã ẩn', rejected: 'Từ chối' },
  promo: { draft: 'Nháp', scheduled: 'Đã lên lịch', active: 'Đang chạy', inactive: 'Đã tắt', expired: 'Hết hạn', paused: 'Tạm dừng', ended: 'Kết thúc' },
  coupon: { draft: 'Nháp', active: 'Đang chạy', inactive: 'Đã tắt', expired: 'Hết hạn' },
  warehouse: { active: 'Hoạt động', inactive: 'Ngừng' },
  invoice: { draft: 'Nháp', issued: 'Đã xuất', cancelled: 'Đã hủy' },
  adjust: { draft: 'Nháp', posted: 'Đã chốt', cancelled: 'Đã hủy' },
  transfer: { draft: 'Nháp', requested: 'Đã yêu cầu', approved: 'Đã duyệt', in_transit: 'Đang chuyển', received: 'Đã nhận', cancelled: 'Đã hủy' },
  move: { purchase: 'Nhập hàng', sale: 'Bán hàng', return: 'Trả hàng', adjustment: 'Điều chỉnh', transfer_in: 'Chuyển đến', transfer_out: 'Chuyển đi', reservation: 'Giữ hàng', release: 'Giải phóng', damage: 'Hư hỏng', loss: 'Mất mát' },
  cash: { income: 'Thu', expense: 'Chi', refund: 'Hoàn tiền', shipping_cost: 'Phí vận chuyển', purchase: 'Nhập hàng', adjustment: 'Điều chỉnh' },
  paymethod: { cod: 'Thu hộ (COD)', bank_transfer: 'Chuyển khoản', gateway: 'Cổng thanh toán', card: 'Thẻ', wallet: 'Ví điện tử', other: 'Khác' },
  paytype: { authorize: 'Ủy quyền', capture: 'Thu tiền', charge: 'Thu tiền', refund: 'Hoàn tiền', void: 'Hủy', verify: 'Xác minh', webhook: 'Webhook' },
  txtype: { pending: 'Chờ', success: 'Thành công', failed: 'Thất bại' },
};

export const t = (group, v) => VI[group]?.[v] ?? (v || '—');

// Options cho Select đổi trạng thái: [{value: code, label: tiếng Việt}]
export const opts = (group, codes) => codes.map((c) => ({ value: c, label: t(group, c) }));
