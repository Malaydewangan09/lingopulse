import SectionHeader from '@/components/dashboard/SectionHeader';

export interface InsightCard {
  eyebrow: string;
  title: string;
  detail: string;
  footer?: string;
  tone?: 'accent' | 'warning' | 'danger' | 'success' | 'neutral';
}

interface Props {
  cards: InsightCard[];
}

const TONE_STYLES: Record<NonNullable<InsightCard['tone']>, { glow: string; text: string; border: string }> = {
  accent:  { glow: 'rgba(0,229,160,0.14)', text: 'var(--accent)',  border: 'rgba(0,229,160,0.18)' },
  warning: { glow: 'rgba(230,168,23,0.14)', text: 'var(--warning)', border: 'rgba(230,168,23,0.18)' },
  danger:  { glow: 'rgba(240,82,72,0.14)',  text: 'var(--danger)',  border: 'rgba(240,82,72,0.18)' },
  success: { glow: 'rgba(63,200,122,0.14)', text: 'var(--success)', border: 'rgba(63,200,122,0.18)' },
  neutral: { glow: 'rgba(75,158,255,0.12)', text: 'var(--blue)',    border: 'rgba(75,158,255,0.18)' },
};

export default function DashboardInsights({ cards }: Props) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Focus Board"
        subtitle="what needs attention right now"
        tooltip="A quick operator view of the repo: weakest locale, hottest module, recent scan signal, and where to focus next."
      />
      <div className="dashboard-insights-grid" style={{ padding: 16 }}>
        {cards.map(card => {
          const tone = TONE_STYLES[card.tone ?? 'neutral'];
          return (
            <div
              key={`${card.eyebrow}-${card.title}`}
              style={{
                minWidth: 0,
                borderRadius: 12,
                border: `1px solid ${tone.border}`,
                background: `linear-gradient(180deg, ${tone.glow} 0%, var(--bg) 100%)`,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: tone.text,
                  fontFamily: 'DM Mono, monospace',
                  marginBottom: 10,
                }}
              >
                {card.eyebrow}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.25, color: 'var(--text-1)', fontWeight: 600, marginBottom: 8 }}>
                {card.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                {card.detail}
              </div>
              {card.footer && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    fontSize: 10,
                    color: 'var(--text-3)',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {card.footer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
