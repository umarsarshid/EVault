import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useVault } from './VaultContext'

export default function Landing() {
  const navigate = useNavigate()
  const { enterDemoMode, isSwitchingMode } = useVault()

  const handleEnterDemo = () => {
    enterDemoMode()
    navigate('/vault')
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-8">
        <div className="ev-stamp inline-flex items-center gap-3 rounded-full px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.32em] text-sand-600 shadow-[0_12px_24px_rgba(36,26,20,0.08)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Evidence Vault
        </div>

        <div className="space-y-4">
          <h1 className="ev-hairline text-4xl font-semibold text-sand-900 dark:text-sand-50 sm:text-5xl lg:text-6xl">
            Document safely, offline, and under your control.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-sand-600 dark:text-sand-300 sm:text-lg">
            Capture testimony and media in a local vault, then export a tamper-evident bundle
            built for lawyers and journalists. No cloud, no account, no network required.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/vault/new')}>Create vault</Button>
            <Button variant="outline" onClick={() => navigate('/export')}>
              Open a demo bundle
            </Button>
            <Button variant="ghost" onClick={handleEnterDemo} disabled={isSwitchingMode}>
              Enter demo vault
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Local only', detail: 'Encrypted at rest' },
            { label: 'Manual redaction', detail: 'Pixelate sensitive areas' },
            { label: 'Chain of custody', detail: 'Hash + signature trail' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-dashed border-sand-300/70 bg-white/70 p-4 text-sm text-sand-700 shadow-[0_12px_24px_rgba(36,26,20,0.06)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200 sm:p-5"
            >
              <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
                {item.label}
              </p>
              <p className="mt-2 font-semibold text-sand-900 dark:text-sand-50">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-dashed border-sand-300/70 bg-white/70 p-5 text-sm text-sand-700 shadow-[0_14px_28px_rgba(36,26,20,0.08)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200">
            <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
              Capture modes
            </p>
            <ul className="mt-3 space-y-2">
              {['Photo + video recording', 'Audio testimony', 'Written statements'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="rounded-3xl border border-dashed border-sand-300/70 bg-white/70 p-5 text-sm text-sand-700 shadow-[0_14px_28px_rgba(36,26,20,0.08)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200">
            <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
              Export bundle
            </p>
            <ul className="mt-3 space-y-2">
              {['Manifest JSON + CSV', 'Custody log with signatures', 'Offline verifier'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <Card
          title="Vault setup"
          description="Start a local vault to collect evidence. Nothing leaves this device."
        >
          <div className="space-y-4">
            <Input placeholder="Vault name" />
            <Input type="password" placeholder="Passphrase" />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/vault/new')}>Create vault</Button>
              <Button variant="outline" onClick={() => navigate('/capture')}>
                Preview capture
              </Button>
            </div>
            <p className="text-xs text-sand-600 dark:text-sand-400">
              Evidence stays encrypted until you export a bundle for review.
            </p>
          </div>
        </Card>

        <Card title="Safety note" description="Follow local laws and consent requirements.">
          <p className="text-sm text-sand-700 dark:text-sand-300">
            Avoid uploading sensitive evidence to unsafe channels. Keep originals secure and
            share only the minimum necessary for review.
          </p>
        </Card>
      </div>
    </div>
  )
}
