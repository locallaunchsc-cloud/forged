'use client';

import { useRef, useState } from 'react';

export default function FloatingProduct({ src, alt, size = 420 }) {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMouseMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 10 });
  }

  function onMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div ref={wrapRef} className="floating-wrap" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <div className="bob">
        <div
          className="tilt"
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
        >
          {src ? (
            <img src={src} alt={alt} />
          ) : (
            <div className="placeholder">No product image yet</div>
          )}
        </div>
      </div>
      <div className="floating-shadow" />

      <style jsx>{`
        .floating-wrap {
          perspective: 1200px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .bob {
          width: min(${size}px, 80%);
          aspect-ratio: 1;
          animation: bob 5s ease-in-out infinite;
        }
        .tilt {
          width: 100%;
          height: 100%;
          transition: transform 0.15s ease-out;
          transform-style: preserve-3d;
          will-change: transform;
        }
        .tilt img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 30px 40px rgba(0, 0, 0, 0.45));
        }
        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b6459;
          font-size: 0.9rem;
          border: 1px dashed #3a352e;
          border-radius: 12px;
        }
        .floating-shadow {
          width: 220px;
          height: 28px;
          margin-top: 8px;
          background: radial-gradient(ellipse, rgba(0, 0, 0, 0.5) 0%, transparent 70%);
          animation: shadow-pulse 5s ease-in-out infinite;
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }
        @keyframes shadow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
