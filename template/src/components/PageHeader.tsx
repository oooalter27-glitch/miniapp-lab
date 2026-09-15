import Link from "next/link";

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-[var(--color-border)] px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <Link href="/" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-sm font-medium text-[var(--color-text)]">{title}</span>
      </div>
    </header>
  );
}
