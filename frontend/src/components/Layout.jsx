export default function Layout({ header, sidebar, children, footer }) {
  return (
    <div className="app-shell">
      {header}
      <div className="app-body">
        {sidebar}
        <main className="main">
          {children}
          {footer}
        </main>
      </div>
    </div>
  );
}
