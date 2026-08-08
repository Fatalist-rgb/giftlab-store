/**
 * Payment and bank marks, drawn rather than fetched.
 *
 * These are the logos every Polish checkout shows, and the shop must show them before
 * the buyer commits. Building them from type and two circles keeps us off other
 * companies' image CDNs and off the licence question that comes with their asset kits,
 * and it costs no requests on the critical path. Each mark carries an aria-label
 * because to a screen reader a styled <span> is just text.
 */

const chip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 30,
  padding: '0 10px',
  background: '#fff',
  borderRadius: 8,
  border: '1px solid rgba(23,19,26,.12)',
  boxShadow: '0 1px 2px rgba(0,0,0,.14)',
};
const dark: React.CSSProperties = { ...chip, background: '#000', border: 'none' };

export function PayMarks({ className = 'flex flex-wrap items-center gap-2' }: { className?: string }) {
  return (
    <div className={className}>
      <span style={dark} aria-label="BLIK">
        <span style={{ font: '900 15px/1 Arial,sans-serif', color: '#fff', letterSpacing: '.3px' }}>
          bl<span style={{ color: '#E5157B' }}>i</span>k
        </span>
      </span>
      <span style={chip} aria-label="Przelewy24">
        <span style={{ font: '800 13px/1 Arial,sans-serif', color: '#1a1a1a' }}>Przelewy</span>
        <span style={{ font: '900 12px/1 Arial,sans-serif', color: '#fff', background: '#D0021B', borderRadius: 4, padding: '1px 4px', marginLeft: 3 }}>
          24
        </span>
      </span>
      <span style={chip} aria-label="Visa">
        <span style={{ font: 'italic 900 15px/1 Arial,sans-serif', color: '#1434CB', letterSpacing: '.4px' }}>VISA</span>
      </span>
      <span style={chip} aria-label="Mastercard">
        <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true">
          <circle cx="13" cy="11" r="9.5" fill="#EB001B" />
          <circle cx="21" cy="11" r="9.5" fill="#F79E1B" style={{ mixBlendMode: 'multiply' }} />
        </svg>
      </span>
    </div>
  );
}

const bankChip: React.CSSProperties = {
  ...chip,
  height: 28,
  boxShadow: '0 1px 2px rgba(0,0,0,.1)',
  font: '800 13px/1 Arial,sans-serif',
  whiteSpace: 'nowrap',
};

const BANKS: [string, string][] = [
  ['mBank', '#E60000'],
  ['PKO BP', '#003574'],
  ['ING', '#FF6200'],
  ['Santander', '#EC0000'],
  ['Pekao', '#E30613'],
  ['millennium', '#4B286D'],
];

export function BankMarks({ className = 'flex flex-wrap items-center gap-2' }: { className?: string }) {
  return (
    <div className={className}>
      {BANKS.map(([name, color]) => (
        <span key={name} style={{ ...bankChip, color }} aria-label={name}>
          {name}
        </span>
      ))}
    </div>
  );
}
