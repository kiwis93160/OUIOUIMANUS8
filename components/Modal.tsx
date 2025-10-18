
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  anchor?: DOMRect | DOMRectReadOnly | null;
}

const VIEWPORT_MARGIN = 16;

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  anchor = null,
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchor) {
      setPosition(null);
      return;
    }

    const anchorCenterX = anchor.left + anchor.width / 2;
    const anchorCenterY = anchor.top + anchor.height / 2;

    const updatePosition = () => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;

      let left = anchorCenterX - rect.width / 2;
      left = Math.max(VIEWPORT_MARGIN, Math.min(left, innerWidth - rect.width - VIEWPORT_MARGIN));

      let top = anchorCenterY - rect.height / 2;
      top = Math.max(VIEWPORT_MARGIN, Math.min(top, innerHeight - rect.height - VIEWPORT_MARGIN));

      setPosition({ top, left });
    };

    let frame = window.requestAnimationFrame(updatePosition);
    const handleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [anchor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    maxHeight: 'calc(100vh - 2rem)',
    maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
  };

  const anchorCenterX = anchor ? anchor.left + anchor.width / 2 : null;
  const anchorCenterY = anchor ? anchor.top + anchor.height / 2 : null;

  const anchoredStyle: React.CSSProperties | undefined = anchor
    ? {
        top: position?.top ?? anchorCenterY ?? anchor.top,
        left: position?.left ?? anchorCenterX ?? anchor.left,
        transform: position ? undefined : 'translate(-50%, -50%)',
      }
    : undefined;

  const centeredStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`fixed flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${sizeClasses[size]} sm:max-h-[90vh] focus:outline-none`}
        style={{
          ...baseStyle,
          ...(anchor ? anchoredStyle : centeredStyle),
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 sm:px-6">
          <h3
            id={headingId}
            className="text-[clamp(1.05rem,2.2vw,1.4rem)] font-semibold leading-snug text-slate-900 break-words text-balance whitespace-normal [hyphens:auto]"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            aria-label="Fermer la fenêtre modale"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
