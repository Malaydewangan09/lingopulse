'use client';

interface Props {
  title: string;
  subtitle?: string;
}

export default function ProductPageLoader({ title, subtitle }: Props) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        position: 'relative',
        zIndex: 1,
        padding: 24,
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14, textAlign: 'center', maxWidth: 420 }}>
        <div style={{ position: 'relative', width: 76, height: 76, display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid color-mix(in srgb, var(--border-bright) 72%, transparent)',
              opacity: 0.65,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 6,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'var(--accent)',
              borderRightColor: 'color-mix(in srgb, var(--accent) 34%, transparent)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="3" fill="#070B14" />
              <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none" />
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          lingo<span style={{ color: 'var(--accent)' }}>pulse</span>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
