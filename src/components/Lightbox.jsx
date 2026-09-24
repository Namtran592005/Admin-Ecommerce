import { useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// Lightbox DÙNG Radix Dialog để xếp lớp đúng với các dialog khác:
// bấm trong lightbox không bao giờ làm dialog bên dưới đóng theo.
export default function Lightbox({ items = [], index, onClose, onNav }) {
  const total = items.length;
  const cur = index !== null && index !== undefined ? items[index] : null;
  const open = cur !== null && cur !== undefined;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') onNav((index - 1 + total) % total);
      if (e.key === 'ArrowRight') onNav((index + 1) % total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, total, onNav]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/90" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[70] flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-transparent outline-none"
        >
          <div className="flex items-center justify-between px-1 py-2 text-white">
            <span className="text-sm text-white/70">
              {index !== null && index !== undefined ? `${index + 1} / ${total}` : ''}{cur?.caption ? ` · ${cur.caption}` : ''}
            </span>
            <DialogPrimitive.Close asChild>
              <button className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Đóng xem ảnh">
                <X className="size-5" />
              </button>
            </DialogPrimitive.Close>
          </div>
          {cur && (
            <div className="flex min-h-0 flex-1 items-center justify-center gap-2">
              {total > 1 && (
                <button onClick={() => onNav((index - 1 + total) % total)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Ảnh trước">
                  <ChevronLeft className="size-6" />
                </button>
              )}
              <img src={cur.src} alt={cur.caption || ''} className="max-h-[76vh] max-w-[86vw] rounded-lg object-contain" />
              {total > 1 && (
                <button onClick={() => onNav((index + 1) % total)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Ảnh sau">
                  <ChevronRight className="size-6" />
                </button>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
