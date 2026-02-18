import React from "react";

function formatPrice(price) {
  if (!Number.isFinite(price)) return "--";
  return `INR ${price.toFixed(2)}`;
}

function formatChange(changePct) {
  if (!Number.isFinite(changePct)) return "0.00%";
  const sign = changePct > 0 ? "+" : "";
  return `${sign}${changePct.toFixed(2)}%`;
}

export default function LiveTicker({ quotes = [] }) {
  if (!quotes.length) {
    return (
      <div className="ticker-strip">
        <div className="ticker-empty">Waiting for live ticker updates...</div>
      </div>
    );
  }

  const loopedQuotes = [...quotes, ...quotes];

  return (
    <div className="ticker-strip" role="status" aria-live="polite">
      <div className="ticker-track">
        {loopedQuotes.map((quote, index) => {
          const tone =
            quote.changePct > 0 ? "up" : quote.changePct < 0 ? "down" : "flat";

          return (
            <div key={`${quote.symbol}-${index}`} className={`ticker-item ${tone}`}>
              <span className="ticker-symbol">{quote.symbol}</span>
              <span className="ticker-separator">|</span>
              <span className="ticker-price">{formatPrice(quote.price)}</span>
              <span className="ticker-separator">|</span>
              <span className="ticker-change">{formatChange(quote.changePct)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
