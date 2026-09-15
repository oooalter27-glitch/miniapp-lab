"use client";

import { useState } from "react";
import { useTelegram } from "@/lib/telegram";

interface Field {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: string[];
}

interface LeadFormProps {
  fields: Field[];
  buttonText: string;
  service: string;
  gradient?: string;
}

export default function LeadForm({ fields, buttonText, service, gradient }: LeadFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { initData } = useTelegram();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    // Подписи полей, а не служебные имена: владелец читает заявку глазами.
    const named: Record<string, string> = {};
    for (const f of fields) if (formData[f.name]) named[f.label] = formData[f.name];

    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, fields: named, initData }),
      });
      const j = await r.json().catch(() => ({ ok: false }));
      if (!r.ok || !j.ok) throw new Error(j.error || "не отправилось");
      setSent(true);
    } catch (err) {
      // Показываем отказ, а не рисуем «Заявка отправлена» поверх пустоты:
      // человек должен знать, что до нас не дошло, и написать другим способом.
      setError((err as Error).message || "не отправилось");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: gradient || "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Заявка отправлена</h3>
        <p className="text-[var(--color-text-muted)]">Свяжемся в течение 30 минут</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">{field.label}</label>
          {field.options ? (
            <select
              required
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-accent-purple)] focus:outline-none transition-colors"
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            >
              <option value="">{field.placeholder || "Выберите..."}</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || "text"}
              required
              placeholder={field.placeholder}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent-purple)] focus:outline-none transition-colors"
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            />
          )}
        </div>
      ))}
      {error && (
        <p className="text-sm text-red-400">
          Не отправилось: {error}. Напишите нам напрямую — заявка не потерялась зря.
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="glow-button w-full disabled:opacity-50"
        style={gradient ? { background: gradient } : {}}
      >
        {sending ? "Отправляю..." : buttonText}
      </button>
    </form>
  );
}
