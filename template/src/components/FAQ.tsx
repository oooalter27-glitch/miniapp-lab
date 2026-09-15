"use client";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQProps {
  items: FAQItem[];
  title?: string;
}

export default function FAQ({ items, title = "Частые вопросы" }: FAQProps) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <details key={i} className="glass-card group">
            <summary className="p-4 text-sm text-white cursor-pointer flex items-center justify-between list-none">
              <span>{item.q}</span>
              <svg className="w-4 h-4 text-[var(--color-text-muted)] group-open:rotate-180 transition-transform shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 text-sm text-[var(--color-text-muted)] leading-relaxed">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
