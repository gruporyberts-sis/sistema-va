import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: 40, minHeight: '100vh', background: '#f1f5f9' }}>
      <h1 style={{ fontSize: 36, fontWeight: 'bold', color: '#0f172a' }}>
        Sistema VA - GrupoRybert
      </h1>

      <p style={{ marginTop: 12, fontSize: 18, color: '#334155' }}>
        Página principal funcionando correctamente.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link
          href="/personas"
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Ir a Personas
        </Link>
      </div>
    </main>
  )
}