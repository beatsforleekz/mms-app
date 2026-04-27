export default function StatementsPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '96px 24px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>To run statements, use the Statements App</p>
        <a
          href="https://alikasstatementapp.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: '#111',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          Open Statements App
        </a>
      </div>
    </main>
  );
}
