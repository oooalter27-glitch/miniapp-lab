"use client";

import { useEffect, useState } from "react";

/**
 * Доступ к Telegram WebApp из React.
 *
 * Зачем обёртка, а не window.Telegram напрямую: мини-апп отлаживается в
 * обычном браузере, где никакого Telegram нет. Без заглушки каждая страница
 * падала бы при разработке, и проверить вёрстку можно было бы только с
 * телефона. Здесь вне Telegram возвращается ready: false и пустой юзер —
 * страница просто работает как обычный сайт.
 */

export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TgUser; start_param?: string };
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  MainButton?: {
    setText: (t: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
};

function getWebApp(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp ?? null;
}

export function useTelegram() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<TgUser | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return; // браузер — работаем как обычный сайт
    wa.ready();
    wa.expand(); // на весь экран, иначе мини-апп открывается половинкой
    setUser(wa.initDataUnsafe?.user ?? null);
    setStartParam(wa.initDataUnsafe?.start_param ?? null);
    setReady(true);
  }, []);

  return {
    ready,
    user,
    startParam,
    /** Сырой initData — нужен серверу, чтобы проверить подпись. */
    initData: getWebApp()?.initData ?? "",
    isTelegram: Boolean(getWebApp()),
    close: () => getWebApp()?.close(),
    openLink: (url: string) => {
      const wa = getWebApp();
      // Внутри Telegram обычный переход открывает ссылку в куцем вебвью —
      // openLink отдаёт её системному браузеру.
      if (wa) wa.openLink(url);
      else window.open(url, "_blank");
    },
  };
}
