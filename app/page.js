'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import useReveal from './components/useReveal';

const FloatingProductLazy = dynamic(() => import('./components/FloatingProduct'), { ssr: false });

function RevealSection({ children, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className={`${className} reveal ${visible ? 'visible' : ''}`}>
      {children}
      <style jsx>{`
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}

export default function StorefrontPage() {
  const [drop, setDrop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        // Featured drop = everything currently live in the shop (today: cap + tee).
        // Titles containing "Black Bull" get pinned first, rest follow.
        const products = data.products || [];
        const sorted = [...products].sort((a, b) => {
          const aMatch = /black\s*bull/i.test(a.title) ? -1 : 0;
          const bMatch = /black\s*bull/i.test(b.title) ? -1 : 0;
          return aMatch - bMatch;
        });
        setDrop(sorted);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&display=swap" />

      <main className="page">
        <div className="glow" aria-hidden="true" />

        <nav className="nav">
          <div className="wordmark">FORGED</div>
        </nav>

        <section className="hero">
          <p className="eyebrow">New drop</p>
          <h1>The Black Bull</h1>
          <p className="hero-sub">
            Ansem's first physical drop. Paid in <span className="accent">$ANSEM</span>, verified on-chain, shipped anywhere.
          </p>
        </section>

        <RevealSection className="spotlight">
          {loading && <p className="status-msg">Loading drop…</p>}
          {error && <p className="status-msg error">Couldn't load the drop: {error}</p>}
          {!loading && !error && drop.length === 0 && (
            <p className="status-msg">
              Drop isn't live yet — add products in Printify and they'll appear here.
            </p>
          )}

          <div className="product-row" data-count={drop.length}>
            {drop.map((p) => {
              const priceUsd = p.variants?.[0]?.priceCents
                ? (p.variants[0].priceCents / 100).toFixed(2)
                : null;
              return (
                <div key={p.id} className="product-card">
                  <FloatingProductLazy src={p.image} alt={p.title} size={340} />
                  <h2>{p.title}</h2>
                  {priceUsd && <p className="price">${priceUsd}</p>}
                  <a href={`/checkout?productId=${p.id}`} className="cta">
                    Pay with $ANSEM →
                  </a>
                </div>
              );
            })}
          </div>
        </RevealSection>

        <RevealSection className="how">
          <div className="how-head">
            <h2>How it works</h2>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <p className="how-num">01</p>
              <h3>Connect wallet</h3>
              <p>Phantom, one click.</p>
            </div>
            <div className="how-step">
              <p className="how-num">02</p>
              <h3>Pay in $ANSEM</h3>
              <p>Live price, verified on-chain before anything ships.</p>
            </div>
            <div className="how-step">
              <p className="how-num">03</p>
              <h3>It ships</h3>
              <p>Production starts the moment payment confirms.</p>
            </div>
          </div>
        </RevealSection>

        <footer className="footer">
          <p>Forged</p>
        </footer>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <style jsx>{`
        .page {
          position: relative;
          background: #050505;
          color: #f5f2ee;
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100vh;
          overflow: hidden;
        }

        .glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 700px;
          background: radial-gradient(ellipse, rgba(217, 113, 60, 0.22) 0%, rgba(217, 113, 60, 0.05) 40%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .nav, .hero, .spotlight, .how, .footer {
          position: relative;
          z-index: 1;
        }

        .nav {
          display: flex;
          justify-content: center;
          padding: 32px 24px 0;
        }
        .wordmark {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.2em;
          color: #9a9184;
        }

        .hero {
          text-align: center;
          max-width: 760px;
          margin: 0 auto;
          padding: 90px 24px 30px;
        }
        .eyebrow {
          font-size: 0.85rem;
          color: #e0824d;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 0 0 20px;
          font-weight: 500;
        }
        .hero h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 5.5rem;
          line-height: 1.02;
          font-weight: 700;
          margin: 0 0 24px;
          letter-spacing: -0.03em;
          background: linear-gradient(180deg, #ffffff 0%, #d8d2c8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero-sub {
          color: #b3aa9d;
          font-size: 1.2rem;
          line-height: 1.6;
          margin: 0 auto;
          max-width: 500px;
        }
        .accent {
          color: #e0824d;
          font-weight: 500;
        }

        .spotlight {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 120px;
        }
        .status-msg { text-align: center; color: #a89e93; }
        .status-msg.error { color: #e05a4e; }

        .product-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 40px;
          justify-items: center;
        }
        .product-row[data-count="1"] {
          grid-template-columns: minmax(280px, 480px);
        }

        .product-card {
          text-align: center;
          padding: 32px 24px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          width: 100%;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .product-card:hover {
          border-color: rgba(224, 130, 77, 0.4);
          transform: translateY(-4px);
        }
        .product-card h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          margin: 8px 0 6px;
        }
        .price {
          font-size: 1.15rem;
          color: #e0824d;
          font-weight: 500;
          margin: 0 0 20px;
        }
        .cta {
          display: inline-block;
          background: #e0824d;
          color: #050505;
          padding: 14px 30px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .cta:hover {
          background: #f0996a;
          transform: scale(1.03);
        }

        .how {
          max-width: 1000px;
          margin: 0 auto;
          padding: 100px 24px 120px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .how-head {
          text-align: center;
          margin-bottom: 48px;
        }
        .how-head h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.9rem;
          font-weight: 700;
          margin: 0;
        }
        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .how-step {
          padding: 32px 28px;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .how-num {
          font-family: 'Space Grotesk', sans-serif;
          color: #e0824d;
          font-weight: 700;
          font-size: 0.9rem;
          margin: 0 0 14px;
        }
        .how-step h3 { margin: 0 0 8px; font-size: 1.1rem; font-weight: 500; }
        .how-step p { color: #a89e93; margin: 0; line-height: 1.6; font-size: 0.9rem; }

        .footer {
          text-align: center;
          padding: 48px 32px 40px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer p { color: #4a453d; font-size: 0.8rem; margin: 0; letter-spacing: 0.05em; }

        @media (max-width: 760px) {
          .hero h1 { font-size: 3rem; }
          .hero { padding: 60px 24px 24px; }
          .how { padding: 60px 24px 80px; }
          .how-grid { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>
    </>
  );
}
