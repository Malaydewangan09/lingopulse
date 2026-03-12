'use client';
import { useState, useRef } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
}

export default function Tooltip({ content, children, width = 240 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const show = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - width - 16) });
    }
    setVisible(true);
  };

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
      >
        {children ?? <HelpCircle size={12} color="var(--text-3)" />}
      </div>

      {visible && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
          width, background: '#0D1117',
          border: '1px solid var(--border-bright)',
          borderRadius: 8, padding: '10px 12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease both',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
