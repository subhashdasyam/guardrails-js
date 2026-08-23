// React written correctly. Near misses: sanitised HTML, a postMessage handler
// with an origin check, a config object that mentions tokens by name but reads
// them from the environment.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';

type Order = { id: string; customer: string; total: number; notesHtml: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.example.com';
const TRUSTED_FRAME_ORIGIN = 'https://widgets.example.com';

const config = {
  apiKey: process.env.API_KEY,
  sessionSecret: process.env.SESSION_SECRET,
  publicToken: process.env.NEXT_PUBLIC_TOKEN,
};

export function OrdersTable({ orders }: { orders: Order[] }) {
  const total = orders.reduce((sum, order) => sum + order.total, 0);

  const rows = useMemo(
    () => orders.filter((order) => order.total > 0).sort((a, b) => b.total - a.total),
    [orders],
  );

  return (
    <table>
      <tbody>
        {rows.map((order) => (
          <tr key={order.id}>
            <td>{order.customer}</td>
            <td>{order.total}</td>
            <td dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(order.notesHtml) }} />
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>{total}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export function WidgetBridge() {
  const [payload, setPayload] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== TRUSTED_FRAME_ORIGIN) return;
      if (typeof event.data?.text !== 'string') return;
      setPayload(event.data.text);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return <p>{payload}</p>;
}

export function useOrders(orgId: string) {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(async () => {
    const response = await fetch(new URL(`/orgs/${encodeURIComponent(orgId)}/orders`, API_BASE), {
      credentials: 'include',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('failed to load orders');
    setOrders(await response.json());
  }, [orgId]);

  useEffect(() => {
    load().catch((err) => console.error('order load failed', err));
  }, [load]);

  return { orders, reload: load, hasKey: Boolean(config.publicToken) };
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const safe = href.startsWith('https://') ? href : '#';
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
