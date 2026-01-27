export default function Home() {
  return (
    <main className="home">
      <header className="home__header">
        <p className="home__eyebrow">Evidence Vault</p>
        <h1>Offline-first, locally encrypted evidence capture.</h1>
        <p className="home__lede">
          Create a vault, record testimony or media, and export a tamper-evident
          bundle for legal review.
        </p>
      </header>
      <section className="home__status">
        <span className="pill">Local only</span>
        <span className="pill">No cloud</span>
        <span className="pill">Manual redaction</span>
      </section>
    </main>
  )
}
