interface StatBlockProps {
  value: string;
  label: string;
  color: string;
}

export default function StatBlock({ value, label, color }: StatBlockProps) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold mb-1" style={{ color }}>{value}</div>
      <div className="text-[var(--color-text-muted)] text-xs">{label}</div>
    </div>
  );
}
