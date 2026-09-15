"use client";

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  color: string;
  popular?: boolean;
  ctaText?: string;
  onCta?: () => void;
}

export default function PricingCard({ name, price, period, description, features, color, popular, ctaText = "Оставить заявку", onCta }: PricingCardProps) {
  return (
    <div className={`glass-card p-5 relative ${popular ? "border-2" : ""}`} style={popular ? { borderColor: color } : {}}>
      {popular && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ background: color }}
        >
          Популярный
        </div>
      )}
      <div className="mb-4">
        <div className="text-sm font-semibold text-white">{name}</div>
        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</div>
      </div>
      <div className="mb-4">
        <span className="text-2xl font-bold text-white">{price}</span>
        {period && <span className="text-xs text-[var(--color-text-muted)] ml-1">{period}</span>}
      </div>
      <ul className="space-y-2 mb-5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[var(--color-text-muted)]">{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ background: popular ? color : "transparent", border: popular ? "none" : `1px solid ${color}40` }}
      >
        {ctaText}
      </button>
    </div>
  );
}
