import { useEffect, useState } from 'react';
import { Steps, Card, Input, Button, Table, Select, Tag, message, Space, Descriptions, Result, InputNumber, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { api, errMsg, fmtVND } from '../api/client';

// Nhân viên đặt hộ khách gọi qua SĐT: tìm khách → chọn hàng → giao/thanh toán → chốt.
// Đơn gắn đúng user_id của khách (backend chỉ cho orders.write làm việc này).
export default function OrderCreate() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState([]);
  const [customer, setCustomer] = useState(null); // {id,email,phone} | {guest:true}
  const [custAddrs, setCustAddrs] = useState([]);
  const [lines, setLines] = useState([]);
  const [pQuery, setPQuery] = useState('');
  const [pResults, setPResults] = useState([]);
  const [pDetail, setPDetail] = useState(null);
  const [addr, setAddr] = useState({ recipient_name: '', phone: '', email: '', province_name: '', district_name: '', ward_name: '', address_line: '' });
  const [coupon, setCoupon] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [payMethods, setPayMethods] = useState([]);
  const [shipMethods, setShipMethods] = useState([]);
  const [payCode, setPayCode] = useState('cod');
  const [shipCode, setShipCode] = useState(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.get('/payments/methods').then((r) => setPayMethods(r.data)).catch(() => {});
    api.get('/shipping/methods').then((r) => setShipMethods(r.data)).catch(() => {});
  }, []);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipFee = couponInfo?.coupon?.type === 'free_shipping' ? 0 : Number(shipMethods.find((m) => m.code === shipCode)?.base_fee ?? 30000);
  const discount = couponInfo?.valid ? Number(couponInfo.discount_amount || 0) : 0;
  const total = Math.max(0, subtotal - discount + shipFee);

  const searchCustomer = async () => {
    if (!phone.trim()) return;
    try {
      const { data } = await api.get('/users', { params: { search: phone.trim(), limit: 5 } });
      setFound(data.data || []);
      if (!data.data?.length) message.info('Không thấy khách này — có thể tạo đơn vãng lai bên dưới');
    } catch (e) { message.error(errMsg(e)); }
  };

  const pickCustomer = async (u) => {
    try {
      const { data } = await api.get(`/users/${u.id}`);
      setCustomer({ id: u.id, email: u.email, phone: u.phone });
      const addrs = data.addresses || [];
      setCustAddrs(addrs);
      const d = addrs.find((a) => a.is_default) || addrs[0];
      if (d) setAddr({
        recipient_name: d.recipient_name || '', phone: d.phone || u.phone || '',
        email: u.email || '', province_name: d.province_name || '', district_name: d.district_name || '',
        ward_name: d.ward_name || '', address_line: d.address_line || '',
      });
      else setAddr((a) => ({ ...a, phone: u.phone || '', email: u.email || '' }));
      message.success('Đã chọn khách #' + u.id);
    } catch (e) { message.error(errMsg(e)); }
  };

  const searchProduct = async () => {
    if (!pQuery.trim()) return;
    try {
      const { data } = await api.get('/products', { params: { search: pQuery.trim(), limit: 10 } });
      setPResults(data.data || []);
    } catch (e) { message.error(errMsg(e)); }
  };

  const pickProduct = async (p) => {
    try {
      const { data } = await api.get(`/products/slug/${p.slug}`);
      setPDetail(data);
    } catch (e) { message.error(errMsg(e)); }
  };

  const addLine = (v, qty) => {
    const q = Math.max(1, qty || 1);
    if (q > v.available_qty) return message.warning(`Chỉ còn ${v.available_qty} sản phẩm`);
    setLines((ls) => {
      const ex = ls.find((l) => l.variant_id === v.id);
      if (ex) {
        const nq = Math.min(ex.qty + q, v.available_qty);
        return ls.map((l) => (l.variant_id === v.id ? { ...l, qty: nq } : l));
      }
      return [...ls, { variant_id: v.id, sku: v.sku, name: v.name || v.sku, price: Number(v.price), available: v.available_qty, qty: q }];
    });
  };

  const checkCoupon = async () => {
    if (!coupon.trim()) return setCouponInfo(null);
    try {
      const { data } = await api.post('/promos/coupons/validate', { code: coupon.trim(), order_amount: subtotal });
      setCouponInfo(data);
      message[data.valid ? 'success' : 'warning'](data.valid ? `Áp dụng: giảm ${fmtVND(data.discount_amount)}` : data.error);
    } catch (e) { message.error(errMsg(e)); }
  };

  const submit = async () => {
    if (!lines.length) return message.warning('Chưa có món hàng nào');
    if (!addr.recipient_name || !addr.phone || !addr.province_name || !addr.address_line)
      return message.warning('Điền đủ tên, SĐT, tỉnh, địa chỉ giao hàng');
    try {
      const body = {
        items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.qty })),
        shipping_address: addr, coupon_code: coupon.trim() || undefined,
        payment_method_code: payCode, shipping_method_code: shipCode || undefined,
        customer_note: (note ? '[NV đặt hộ] ' : '[NV đặt hộ]') + note,
        user_id: customer && !customer.guest ? customer.id : undefined,
      };
      const { data } = await api.post('/orders/checkout', body);
      setDone(data);
    } catch (e) { message.error(errMsg(e)); }
  };

  const reset = () => {
    setStep(0); setCustomer(null); setLines([]); setCoupon(''); setCouponInfo(null);
    setNote(''); setDone(null); setFound([]); setPResults([]); setPDetail(null); setPhone('');
  };

  if (done) {
    return (
      <div className="page-card" style={{ maxWidth: 640 }}>
        <Result status="success" title="Đã tạo đơn hộ thành công"
          subTitle={<>Mã đơn <b>{done.order_number}</b> · Tổng <b>{fmtVND(done.total_amount)}</b> · Thanh toán: {done.payment_status}</>}
          extra={<Space><Button type="primary" onClick={reset}>Tạo đơn khác</Button></Space>} />
      </div>
    );
  }

  return (
    <div className="page-card">
      <Typography.Title level={3} style={{ marginTop: 0 }}>Tạo đơn hộ khách</Typography.Title>
      <Steps current={step} onChange={setStep} style={{ marginBottom: 20 }}
        items={[{ title: 'Khách hàng' }, { title: 'Món hàng' }, { title: 'Giao & thanh toán' }, { title: 'Xác nhận' }]} />

      {step === 0 && (<>
        <Space.Compact style={{ width: '100%', maxWidth: 480 }}>
          <Input prefix={<UserOutlined />} placeholder="Nhập SĐT hoặc email khách..." value={phone}
            onChange={(e) => setPhone(e.target.value)} onPressEnter={searchCustomer} />
          <Button type="primary" icon={<SearchOutlined />} onClick={searchCustomer}>Tìm</Button>
        </Space.Compact>
        {found.map((u) => (
          <Card key={u.id} size="small" style={{ marginTop: 8, maxWidth: 480 }}
            extra={<Button size="small" type="primary" onClick={() => pickCustomer(u)}>Chọn</Button>}>
            #{u.id} · {u.email || u.phone} · {u.phone || ''} <Tag>{u.status}</Tag>
          </Card>
        ))}
        <div style={{ marginTop: 12 }}>
          Đang chọn: {customer ? (customer.guest ? <Tag color="orange">Khách vãng lai</Tag>
            : <Tag color="green">Khách #{customer.id} {customer.email || customer.phone}</Tag>) : <Tag>Chưa chọn</Tag>}
        </div>
        <Space style={{ marginTop: 12 }}>
          <Button onClick={() => { setCustomer({ guest: true }); setStep(1); }}>Tiếp tục (vãng lai)</Button>
          <Button type="primary" disabled={!customer} onClick={() => setStep(1)}>Tiếp tục</Button>
        </Space>
      </>)}

      {step === 1 && (<>
        <Space.Compact style={{ width: '100%', maxWidth: 480 }}>
          <Input placeholder="Tìm sản phẩm theo tên/SKU..." value={pQuery}
            onChange={(e) => setPQuery(e.target.value)} onPressEnter={searchProduct} />
          <Button type="primary" icon={<SearchOutlined />} onClick={searchProduct}>Tìm</Button>
        </Space.Compact>
        {pResults.map((p) => (
          <Card key={p.id} size="small" style={{ marginTop: 8 }} extra={<Button size="small" onClick={() => pickProduct(p)}>Chọn</Button>}>
            {p.name} · {fmtVND(p.base_price)}
          </Card>
        ))}
        {pDetail && (
          <Card size="small" title={pDetail.name} style={{ marginTop: 8 }}>
            {(pDetail.variants || []).map((v) => (
              <Space key={v.id} style={{ marginBottom: 6 }} wrap>
                <Tag>{v.sku}</Tag><span>{v.name}</span><b>{fmtVND(v.price)}</b>
                <Tag color={v.available_qty > 0 ? 'green' : 'red'}>Còn {v.available_qty}</Tag>
                <Button size="small" icon={<PlusOutlined />} disabled={v.available_qty <= 0}
                  onClick={() => addLine(v, 1)}>Thêm</Button>
              </Space>
            ))}
          </Card>
        )}
        <h4>Giỏ đơn ({lines.length} dòng — tạm tính {fmtVND(subtotal)})</h4>
        <Table size="small" pagination={false} dataSource={lines} rowKey="variant_id" columns={[
          { title: 'SKU', dataIndex: 'sku' }, { title: 'Tên', dataIndex: 'name' },
          { title: 'Giá', dataIndex: 'price', render: fmtVND },
          { title: 'SL', dataIndex: 'qty', render: (v, r) => (
            <InputNumber size="small" min={1} max={r.available} value={v}
              onChange={(n) => setLines((ls) => ls.map((l) => (l.variant_id === r.variant_id ? { ...l, qty: Math.min(n || 1, r.available) } : l)))} />
          ) },
          { title: 'Tổng', render: (_, r) => fmtVND(r.price * r.qty) },
          { title: '', render: (_, r) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setLines((ls) => ls.filter((l) => l.variant_id !== r.variant_id))} /> },
        ]} />
        <Space style={{ marginTop: 12 }}>
          <Button onClick={() => setStep(0)}>Quay lại</Button>
          <Button type="primary" disabled={!lines.length} onClick={() => setStep(2)}>Tiếp tục</Button>
        </Space>
      </>)}

      {step === 2 && (<>
        {custAddrs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Typography.Text type="secondary">Địa chỉ đã lưu của khách: </Typography.Text>
            {custAddrs.map((a) => (
              <Button key={a.id} size="small" style={{ margin: 2 }} onClick={() => setAddr({
                recipient_name: a.recipient_name, phone: a.phone, email: customer.email || '',
                province_name: a.province_name, district_name: a.district_name || '',
                ward_name: a.ward_name || '', address_line: a.address_line,
              })}>Dùng: {a.address_line}</Button>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
          <Input placeholder="Người nhận *" value={addr.recipient_name} onChange={(e) => setAddr({ ...addr, recipient_name: e.target.value })} />
          <Input placeholder="SĐT nhận hàng *" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
          <Input placeholder="Tỉnh/Thành *" value={addr.province_name} onChange={(e) => setAddr({ ...addr, province_name: e.target.value })} />
          <Input placeholder="Quận/Huyện" value={addr.district_name} onChange={(e) => setAddr({ ...addr, district_name: e.target.value })} />
          <Input placeholder="Phường/Xã" value={addr.ward_name} onChange={(e) => setAddr({ ...addr, ward_name: e.target.value })} />
          <Input placeholder="Số nhà, đường *" value={addr.address_line} onChange={(e) => setAddr({ ...addr, address_line: e.target.value })} />
          <Space.Compact style={{ width: '100%' }}>
            <Input placeholder="Mã giảm giá" value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponInfo(null); }} />
            <Button onClick={checkCoupon}>Áp dụng</Button>
          </Space.Compact>
          <Select placeholder="Hình thức thanh toán" value={payCode} onChange={setPayCode}
            options={payMethods.map((m) => ({ value: m.code, label: m.name }))} />
          <Select placeholder="Hình thức giao hàng" allowClear value={shipCode} onChange={setShipCode}
            options={shipMethods.map((m) => ({ value: m.code, label: `${m.name} (+${fmtVND(m.base_fee)})` }))} />
          <Input.TextArea rows={2} placeholder="Ghi chú..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Space style={{ marginTop: 12 }}>
          <Button onClick={() => setStep(1)}>Quay lại</Button>
          <Button type="primary" onClick={() => setStep(3)}>Tiếp tục</Button>
        </Space>
      </>)}

      {step === 3 && (<>
        <Descriptions bordered size="small" column={1} style={{ maxWidth: 560 }}>
          <Descriptions.Item label="Khách">{customer?.guest ? 'Vãng lai' : `#${customer?.id} ${customer?.email || customer?.phone}`}</Descriptions.Item>
          <Descriptions.Item label="Nhận hàng">{addr.recipient_name} · {addr.phone} · {addr.address_line}, {addr.province_name}</Descriptions.Item>
          <Descriptions.Item label="Món hàng">{lines.map((l) => `${l.name} × ${l.qty}`).join('; ')}</Descriptions.Item>
          <Descriptions.Item label="Tạm tính">{fmtVND(subtotal)}</Descriptions.Item>
          <Descriptions.Item label="Giảm giá">-{fmtVND(discount)}</Descriptions.Item>
          <Descriptions.Item label="Phí ship">+{fmtVND(shipFee)}</Descriptions.Item>
          <Descriptions.Item label="Tổng thu (dự kiến)"><b>{fmtVND(total)}</b></Descriptions.Item>
        </Descriptions>
        <Space>
          <Button onClick={() => setStep(2)}>Quay lại</Button>
          <Button type="primary" onClick={submit}>Chốt đơn</Button>
        </Space>
      </>)}
    </div>
  );
}
