export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p className="app-footer-line">
        Copyright (c) {year} Subhash Kumar Singh. All rights reserved.
      </p>
      <p className="app-footer-note">
        Power Sector Dashboard | Market data powered by FYERS APIs.
      </p>
    </footer>
  );
}

