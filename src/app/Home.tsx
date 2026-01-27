import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-sand-700">
            Evidence Vault
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-sand-900 lg:text-5xl">
              Offline-first, locally encrypted evidence capture.
            </h1>
            <p className="text-base text-sand-700">
              Create a vault, record testimony or media, and export a tamper-evident bundle
              for legal review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['Local only', 'No cloud', 'Manual redaction'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-sand-200 bg-white/70 px-3 py-1 text-xs font-medium text-sand-700"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <Card
          title="Vault setup"
          description="Start a local vault to collect evidence. Nothing leaves this device."
        >
          <div className="space-y-4">
            <Input placeholder="Vault name" />
            <Input type="password" placeholder="Passphrase" />
            <div className="flex flex-wrap gap-3">
              <Button>Create vault</Button>
              <Button variant="outline">Preview capture</Button>
            </div>
            <p className="text-xs text-sand-600">
              Evidence stays encrypted until you export a bundle for review.
            </p>
          </div>
        </Card>
      </div>
    </main>
  )
}
