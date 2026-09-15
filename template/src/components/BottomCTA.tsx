"use client";

import { useState } from "react";

interface BottomCTAProps {
  title: string;
  subtitle: string;
  badge?: string;
  color: string;
  service: string;
  buttonText?: string;
  inputPlaceholder?: string;
}

export default function BottomCTA({ title, subtitle, badge, color, service, buttonText = "Отправить", inputPlaceholder = "Telegram или телефон" }: BottomCTAProps) {
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!contact) return;
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.sendData(JSON.stringify({ service, contact }));
    }
    setSent(true);
  };

  if (sent) {
    return (
      <section className="mb-10">
        <div className="p-6 rounded-2xl text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
          <div className="text-2xl mb-2">&#10003;</div>
          <div className="text-sm font-medium text-white">Заявка отправлена</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Свяжемся в течение 30 минут</div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <div className="p-6 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)`, border: `1px solid ${color}25` }}>
        {badge && (
          <div className="text-xs font-medium mb-3" style={{ color }}>{badge}</div>
        )}
        <div className="text-xl font-bold text-white mb-2">{title}</div>
        <div className="text-sm text-[var(--color-text-muted)] mb-5 max-w-sm mx-auto">{subtitle}</div>
        <div className="flex gap-2 max-w-sm mx-auto">
          <input
            type="text"
            placeholder={inputPlaceholder}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none transition-colors"
            style={{ borderColor: contact ? color : undefined }}
          />
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white whitespace-nowrap transition-all hover:opacity-90"
            style={{ background: color }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </section>
  );
}
