interface ProcessStepProps {
  number: number;
  title: string;
  description: string;
  color: string;
  isLast?: boolean;
}

export default function ProcessStep({ number, title, description, color, isLast }: ProcessStepProps) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: color }}
        >
          {number}
        </div>
        {!isLast && (
          <div className="w-px flex-1 min-h-[24px] bg-[var(--color-border)] mt-2" />
        )}
      </div>
      <div className="pb-6">
        <div className="text-sm font-semibold text-white mb-1">{title}</div>
        <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
