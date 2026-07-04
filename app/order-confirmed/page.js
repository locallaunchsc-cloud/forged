'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ConfirmedInner() {
  const params = useSearchParams();
  const sig = params.get('sig');

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1>Order confirmed</h1>
      <p style={{ color: '#666' }}>
        Your payment was verified on-chain and your order was sent to production.
      </p>
      {sig && (
        <p style={{ wordBreak: 'break-all', fontSize: '0.85rem', marginTop: 24 }}>
          Transaction:{' '}
          <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">
            {sig}
          </a>
        </p>
      )}
      <Link href="/" style={{ display: 'inline-block', marginTop: 32 }}>
        ← Back to store
      </Link>
    </main>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmedInner />
    </Suspense>
  );
}
