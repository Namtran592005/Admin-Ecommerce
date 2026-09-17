import { useEffect, useState } from 'react';
import { Button, Upload, message, Popconfirm, Input, Row, Col, Card, Image, Typography, Tabs, Tag } from 'antd';
import { UploadOutlined, DeleteOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import { api, errMsg, fmtDate } from '../api/client';
import { mediaUrl } from '../components/pickers';

const kindOf = (mime = '') => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
};
const KIND_LABEL = { image: 'Ảnh', video: 'Video', file: 'Tệp' };

const fmtSize = (v) => {
  if (!v) return '';
  return v > 1048576 ? (v / 1048576).toFixed(1) + ' MB' : (v / 1024).toFixed(0) + ' KB';
};

function Preview({ m }) {
  const k = kindOf(m.mime_type);
  if (k === 'image') return <Image src={mediaUrl(m.object_key)} height={130} style={{ objectFit: 'cover' }} fallback="?" />;
  if (k === 'video') {
    return <video src={mediaUrl(m.object_key)} height={130} style={{ width: '100%', objectFit: 'cover', background: '#000' }} preload="metadata" />;
  }
  return (
    <div style={{ height: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', gap: 4 }}>
      <FileOutlined style={{ fontSize: 36, color: '#888' }} />
      <Tag>{(m.original_name || '').split('.').pop()?.toUpperCase()}</Tag>
    </div>
  );
}

export default function Media() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const load = (quiet = false) => {
    if (!quiet) setLoading(true);
    api.get('/media').then((r) => setRows(r.data)).catch((e) => { if (!quiet) message.error(errMsg(e)); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const upload = async (file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/media/upload', fd);
      message.success('Đã tải lên');
      load(true);
    } catch (e) { message.error(errMsg(e)); }
    return false;
  };

  const remove = async (id) => {
    try { await api.delete(`/media/${id}`); message.success('Đã xóa'); load(true); }
    catch (e) { message.error(errMsg(e)); }
  };

  const copyUrl = async (key) => {
    try { await navigator.clipboard.writeText(mediaUrl(key)); message.success('Đã chép liên kết'); }
    catch { message.error('Không chép được'); }
  };

  const filtered = rows.filter((m) =>
    (tab === 'all' || kindOf(m.mime_type) === tab) &&
    (!q || (m.original_name || '').toLowerCase().includes(q.toLowerCase())));

  const counts = {
    all: rows.length,
    image: rows.filter((m) => kindOf(m.mime_type) === 'image').length,
    video: rows.filter((m) => kindOf(m.mime_type) === 'video').length,
    file: rows.filter((m) => kindOf(m.mime_type) === 'file').length,
  };

  return (
    <div className="page-card">
      <div className="toolbar">
        <Upload beforeUpload={upload} showUploadList={false} accept="image/*,video/*,.pdf,.zip,.doc,.docx,.xls,.xlsx,.txt,.csv">
          <Button type="primary" icon={<UploadOutlined />}>Tải lên</Button>
        </Upload>
        <Input.Search placeholder="Tìm theo tên file..." style={{ width: 260 }} value={q} onChange={(e) => setQ(e.target.value)} />
        <Typography.Text type="secondary">Ảnh ≤ 10MB · video ≤ 100MB · tệp ≤ 20MB</Typography.Text>
      </div>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'all', label: `Tất cả (${counts.all})`, children: null },
        { key: 'image', label: `Ảnh (${counts.image})`, children: null },
        { key: 'video', label: `Video (${counts.video})`, children: null },
        { key: 'file', label: `Tệp (${counts.file})`, children: null },
      ]} />
      <Row gutter={[12, 12]}>
        {filtered.map((m) => (
          <Col xs={12} sm={8} md={6} lg={4} key={m.id}>
            <Card size="small" hoverable cover={<Preview m={m} />}>
              <Typography.Text ellipsis style={{ fontSize: 12, display: 'block' }} title={m.original_name}>#{m.id} · {m.original_name}</Typography.Text>
              <div style={{ fontSize: 11, color: '#888' }}>{KIND_LABEL[kindOf(m.mime_type)]} · {fmtSize(m.size_bytes)} · {fmtDate(m.created_at)}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                <Button size="small" onClick={() => copyUrl(m.object_key)}>Chép link</Button>
                <Button size="small" icon={<DownloadOutlined />} href={mediaUrl(m.object_key)} target="_blank" />
                <Popconfirm title="Xóa file này?" okText="Đồng ý" cancelText="Hủy" onConfirm={() => remove(m.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      {loading && <Typography.Text type="secondary">Đang tải...</Typography.Text>}
    </div>
  );
}
