import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Мини-апп",
  description: "Замените в template/src/app/layout.tsx",
};

/**
 * viewportFit и отсутствие масштабирования — требование мини-аппа: внутри
 * Telegram страница живёт под системными панелями, а двойной тап по кнопке
 * без maximumScale зумит экран вместо нажатия.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {/* SDK грузим до интерактива: хук useTelegram читает window.Telegram
            при первом рендере, и с afterInteractive он иногда не успевает. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
