import Tooltip from '@/components/ui/Tooltip';

interface Props {
  title: string;
  subtitle?: string;
  tooltip?: React.ReactNode;
  right?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, tooltip, right }: Props) {
  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{title}</h3>
          {tooltip && <Tooltip content={tooltip} width={260} />}
        </div>
        {subtitle && (
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
