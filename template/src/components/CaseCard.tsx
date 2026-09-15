interface Metric {
  value: string;
  label: string;
}

interface CaseCardProps {
  tag: string;
  tagColor: string;
  title: string;
  metrics: Metric[];
  quote: string;
  author?: string;
}

export default function CaseCard({ tag, tagColor, title, metrics, quote, author }: CaseCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ color: tagColor, background: `${tagColor}15` }}
        >
          {tag}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{title}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {metrics.map((m, i) => (
          <div key={i} className="text-center p-3 rounded-xl bg-[var(--color-bg)]">
            <div className="text-xl font-bold text-white">{m.value}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <blockquote className="text-xs text-[var(--color-text-muted)] italic leading-relaxed border-l-2 pl-3" style={{ borderColor: tagColor }}>
        {quote}
      </blockquote>
      {author && (
        <div className="text-xs text-[var(--color-text-muted)] mt-2 opacity-70">— {author}</div>
      )}
    </div>
  );
}
