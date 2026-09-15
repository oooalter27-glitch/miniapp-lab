interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export default function SectionTitle({ title, subtitle, align = "left" }: SectionTitleProps) {
  return (
    <div className={`mb-6 ${align === "center" ? "text-center" : ""}`}>
      <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
      {subtitle && (
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-md">{subtitle}</p>
      )}
    </div>
  );
}
