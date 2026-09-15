interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3">{icon}</div>
      <div className="text-sm font-semibold text-white mb-1">{title}</div>
      <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</div>
    </div>
  );
}
