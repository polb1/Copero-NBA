'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  tabIndex?: number;
}

export function TurnstileWidget({
  onToken,
  onError,
  onExpire,
  theme = 'auto',
  tabIndex = 0,
}: TurnstileWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      setLoaded(true);
    };

    return () => {
      if (widgetIdRef.current !== null) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore
        }
      }
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !widgetRef.current) return;

    // Remove existing widget if any
    if (widgetIdRef.current !== null) {
      try {
        (window as any).turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // ignore
      }
    }

    // Render new widget
    widgetIdRef.current = (window as any).turnstile.render(widgetRef.current, {
      sitekey: '0x4AAAAAAF6iaGiVL4Dd5Tbs',
      theme,
      tabindex: tabIndex,
      callback: (token: string) => {
        onToken(token);
      },
      'error-callback': () => {
        onError?.();
      },
      'expired-callback': () => {
        onExpire?.();
      },
    });
  }, [loaded, theme, tabIndex, onToken, onError, onExpire]);

  return <div ref={widgetRef} />;
}