import { useEffect, useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { Hello } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

export function HelloApp() {
  const [text, setText] = useState<string>('…loading');
  const [stamp, setStamp] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    messenger
      .sendRequest(Hello.GetHelloText, HOST_EXTENSION, {
        projectName: 'DeliveryOS',
      })
      .then((res) => {
        if (cancelled) return;
        setText(res.text);
        setStamp(res.timestamp);
      })
      .catch((err: unknown) =>
        setText(`error: ${(err as Error).message}`),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-dos-accent">DeliveryOS</h1>
        <p className="text-sm text-dos-muted">
          Hello panel — webview smoke test
        </p>
      </header>
      <section className="max-w-prose p-4 rounded-md border border-vscode-border bg-dos-surface text-dos-ink">
        <p className="text-base">{text}</p>
        {stamp !== null && (
          <p className="mt-2 text-xs text-dos-muted">
            Host responded at {new Date(stamp).toISOString()}
          </p>
        )}
      </section>
    </main>
  );
}
