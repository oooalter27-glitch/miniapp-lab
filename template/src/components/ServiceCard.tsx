"use client";

import Link from "next/link";
import Image from "next/image";

interface ServiceCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  image?: string;
  delay?: number;
}

export default function ServiceCard({ href, icon, title, subtitle, gradient, image, delay = 0 }: ServiceCardProps) {
  return (
    <Link href={href} className="block">
      <div
        className="glass-card gradient-border p-6 cursor-pointer group overflow-hidden relative"
        style={{ animationDelay: `${delay}ms` }}
      >
        {image && (
          <div className="absolute top-3 right-3 opacity-15 group-hover:opacity-25 transition-opacity">
            <Image src={image} alt="" width={80} height={80} className="rounded-xl" />
          </div>
        )}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white text-xl relative z-10"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        <h3 className="text-[var(--color-text)] font-semibold text-lg mb-2 group-hover:text-white transition-colors relative z-10">
          {title}
        </h3>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed relative z-10">
          {subtitle}
        </p>
        <div className="mt-4 flex items-center text-sm font-medium relative z-10" style={{ color: gradient.includes('purple') ? '#8b5cf6' : gradient.includes('blue') ? '#3b82f6' : gradient.includes('green') ? '#10b981' : '#06b6d4' }}>
          Подробнее
          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}