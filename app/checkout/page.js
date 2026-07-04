'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Connection, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getMint,
} from '@solana/spl-token';

const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET;
const PAYMENT_TOKEN_MINT = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_MINT;
const RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || clusterApiUrl('mainnet-beta');

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get('productId');

  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [ansemPrice, setAnsemPrice] = useState(null); // USD per $ANSEM
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [shipping, setShipping] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    country: '', region: '', address1: '', address2: '', city: '', zip: '',
  });

  useEffect(() => {
    if (!productId) return;
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        const p = (data.products || []).find((x) => String(x.id) === String(productId));
        setProduct(p);
        setVariantId(p?.variants[0]?.id || null);
      });

    fetch('/api/price')
      .then((r) => r.json())
      .then((d) => setAnsemPrice(d.price || null))
      .catch(() => setAnsemPrice(null));
  }, [productId]);

  const priceUsd = product?.variants.find((v) => v.id === variantId)?.priceCents / 100;
  const priceAnsem = ansemPrice && priceUsd ? +(priceUsd / ansemPrice).toFixed(6) : null;

  async function connectWallet() {
    if (!window?.solana?.isPhantom) {
      setErrorMsg('Phantom wallet not found. Install it from phantom.app to pay with $ANSEM.');
      return;
    }
    try {
      setStatus('connecting');
      const resp = await window.solana.connect();
      setWallet(resp.publicKey.toString());
      setStatus('idle');
    } catch {
      setErrorMsg('Wallet connection was rejected.');
      setStatus('idle');
    }
  }

  function updateField(field, value) {
    setShipping((s) => ({ ...s, [field]: value }));
  }

  function shippingComplete() {
    return Object.entries(shipping).every(([key, val]) => key === 'address2' || val.trim() !== '');
  }

  async function payAndOrder() {
    if (!wallet) return setErrorMsg('Connect your wallet first.');
    if (!priceAnsem) return setErrorMsg('Price not loaded yet — try again in a moment.');
    if (!shippingComplete()) return setErrorMsg('Fill in all shipping fields.');
    if (!TREASURY_WALLET || !PAYMENT_TOKEN_MINT) {
      return setErrorMsg('Store payment config missing (treasury wallet or token mint).');
    }

    setErrorMsg('');
    setStatus('paying');

    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const fromPubkey = new PublicKey(wallet);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const mintPubkey = new PublicKey(PAYMENT_TOKEN_MINT);

      // $ANSEM is a Token-2022 mint (has metadataPointer/tokenMetadata extensions),
      // so every call below explicitly targets TOKEN_2022_PROGRAM_ID instead of the
      // legacy TOKEN_PROGRAM_ID that most SPL tokens use.
      const mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID);
      const amountRaw = BigInt(Math.round(priceAnsem * 10 ** mintInfo.decimals));

      const fromATA = await getAssociatedTokenAddress(
        mintPubkey, fromPubkey, false, TOKEN_2022_PROGRAM_ID
      );
      const toATA = await getAssociatedTokenAddress(
        mintPubkey, treasuryPubkey, false, TOKEN_2022_PROGRAM_ID
      );

      const tx = new Transaction();

      // Create the treasury's token account on the fly if it doesn't exist yet —
      // customer pays the tiny rent-exempt fee for this, standard practice.
      const toATAInfo = await connection.getAccountInfo(toATA);
      if (!toATAInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            fromPubkey, toATA, treasuryPubkey, mintPubkey, TOKEN_2022_PROGRAM_ID
          )
        );
      }

      tx.add(
        createTransferInstruction(
          fromATA, toATA, fromPubkey, amountRaw, [], TOKEN_2022_PROGRAM_ID
        )
      );

      tx.feePayer = fromPubkey;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      const { signature } = await window.solana.signAndSendTransaction(tx);

      setStatus('verifying');
      await connection.confirmTransaction(signature, 'confirmed');

      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          productId: product.id,
          variantId,
          priceUsd,
          shippingAddress: shipping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed after payment — contact support with your tx signature.');

      setStatus('done');
      router.push(`/order-confirmed?sig=${signature}`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Payment failed.');
      setStatus('error');
    }
  }

  if (!productId) return <p style={{ padding: 40 }}>No product selected.</p>;
  if (!product) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <main className="checkout">
      <div className="summary">
        {product.image && <img src={product.image} alt={product.title} />}
        <div>
          <h2>{product.title}</h2>
          <p className="price-usd">${priceUsd?.toFixed(2)}</p>
          <p className="price-ansem">
            {priceAnsem ? `≈ ${priceAnsem.toLocaleString()} $ANSEM` : 'Fetching $ANSEM price…'}
          </p>
        </div>
      </div>

      <section className="wallet-section">
        {wallet ? (
          <p className="wallet-connected">Connected: {wallet.slice(0, 4)}…{wallet.slice(-4)}</p>
        ) : (
          <button onClick={connectWallet} disabled={status === 'connecting'}>
            {status === 'connecting' ? 'Connecting…' : 'Connect Phantom Wallet'}
          </button>
        )}
      </section>

      <section className="shipping-form">
        <h3>Shipping details</h3>
        <div className="grid">
          <input placeholder="First name" value={shipping.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
          <input placeholder="Last name" value={shipping.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
          <input placeholder="Email" value={shipping.email} onChange={(e) => updateField('email', e.target.value)} />
          <input placeholder="Phone" value={shipping.phone} onChange={(e) => updateField('phone', e.target.value)} />
          <input placeholder="Address line 1" value={shipping.address1} onChange={(e) => updateField('address1', e.target.value)} />
          <input placeholder="Address line 2 (optional)" value={shipping.address2} onChange={(e) => updateField('address2', e.target.value)} />
          <input placeholder="City" value={shipping.city} onChange={(e) => updateField('city', e.target.value)} />
          <input placeholder="State/Region" value={shipping.region} onChange={(e) => updateField('region', e.target.value)} />
          <input placeholder="ZIP / Postal code" value={shipping.zip} onChange={(e) => updateField('zip', e.target.value)} />
          <input placeholder="Country code (e.g. US)" value={shipping.country} onChange={(e) => updateField('country', e.target.value)} />
        </div>
      </section>

      {errorMsg && <p className="error">{errorMsg}</p>}

      <button
        className="pay-btn"
        onClick={payAndOrder}
        disabled={!wallet || status === 'paying' || status === 'verifying'}
      >
        {status === 'paying' && 'Confirm in wallet…'}
        {status === 'verifying' && 'Verifying payment…'}
        {(status === 'idle' || status === 'error') && `Pay ${priceAnsem ? priceAnsem.toLocaleString() + ' $ANSEM' : ''}`}
      </button>

      <style jsx>{`
        .checkout { max-width: 560px; margin: 0 auto; padding: 48px 24px; font-family: system-ui, sans-serif; }
        .summary { display: flex; gap: 16px; margin-bottom: 32px; align-items: center; }
        .summary img { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; }
        .price-usd { font-size: 1.4rem; font-weight: 700; margin: 4px 0; }
        .price-ansem { color: #666; margin: 0; }
        .wallet-section { margin-bottom: 24px; }
        .wallet-connected { background: #f0f9f0; padding: 10px 14px; border-radius: 8px; color: #2d7a2d; }
        button { padding: 12px 20px; border-radius: 8px; border: none; background: #111; color: white; cursor: pointer; font-size: 1rem; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .shipping-form h3 { margin-bottom: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .grid input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
        .pay-btn { width: 100%; padding: 16px; font-size: 1.1rem; margin-top: 8px; }
        .error { color: #c0392b; margin-bottom: 12px; }
      `}</style>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p style={{ padding: 40 }}>Loading…</p>}>
      <CheckoutInner />
    </Suspense>
  );
}
