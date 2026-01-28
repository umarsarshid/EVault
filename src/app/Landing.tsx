import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { useVault } from './VaultContext'

export default function Landing() {
  const navigate = useNavigate()
  const { enterDemoMode, isSwitchingMode } = useVault()

  const handleEnterDemo = () => {
    enterDemoMode()
    navigate('/vault')
  }

  const handleInstall = async () => {
    if (typeof window === 'undefined') return
    const prompt = window.__evvaultInstallPrompt
    if (prompt) {
      await prompt.prompt()
      await prompt.userChoice
      window.__evvaultInstallPrompt = null
      return
    }
    scrollToSection('install')
  }

  const scrollToSection = (id: string) => {
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const githubUrl =
    (import.meta.env.VITE_GITHUB_URL as string | undefined) ??
    'https://github.com/your-username/evvault'

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
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
              <Button
                onClick={() => {
                  void handleInstall()
                }}
              >
                Install as App
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(githubUrl, '_blank', 'noopener,noreferrer')}
              >
                GitHub
              </Button>
              <Button variant="ghost" onClick={() => scrollToSection('docs')}>
                Docs
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/vault/new')}>Create vault</Button>
              <Button variant="outline" onClick={handleEnterDemo} disabled={isSwitchingMode}>
                Enter demo vault
              </Button>
              <Button variant="ghost" onClick={() => navigate('/capture')}>
                Preview capture
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-dashed border-sand-300/70 bg-white/70 p-4 shadow-[0_18px_36px_rgba(36,26,20,0.12)] dark:border-sand-700 dark:bg-sand-900/60">
            <img
              src="/screens/evvault-vault.svg"
              alt="Vault list preview"
              className="w-full rounded-2xl border border-sand-200/60 bg-white/80 dark:border-sand-700 dark:bg-sand-900/80"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-sand-300/70 bg-white/70 p-3 dark:border-sand-700 dark:bg-sand-900/60">
              <img
                src="/screens/evvault-capture.svg"
                alt="Capture flow preview"
                className="w-full rounded-xl border border-sand-200/60 bg-white/80 dark:border-sand-700 dark:bg-sand-900/80"
              />
            </div>
            <div className="rounded-2xl border border-dashed border-sand-300/70 bg-white/70 p-3 dark:border-sand-700 dark:bg-sand-900/60">
              <img
                src="/screens/evvault-export.svg"
                alt="Export bundle preview"
                className="w-full rounded-xl border border-sand-200/60 bg-white/80 dark:border-sand-700 dark:bg-sand-900/80"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="tour" className="space-y-6">
        <div className="space-y-2">
          <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">Feature tour</p>
          <h2 className="text-2xl font-semibold text-sand-900 dark:text-sand-50">
            From capture to verified export in four steps.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Create vault',
              detail: 'Passphrase-protected, local-only encryption.',
            },
            {
              step: '02',
              title: 'Capture evidence',
              detail: 'Photo, video, audio, or written testimony.',
            },
            {
              step: '03',
              title: 'Redact manually',
              detail: 'Pixelate sensitive areas before sharing.',
            },
            {
              step: '04',
              title: 'Export + verify',
              detail: 'ZIP bundle with hash manifest and custody log.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-dashed border-sand-300/70 bg-white/70 p-5 text-sm text-sand-700 shadow-[0_12px_24px_rgba(36,26,20,0.06)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200"
            >
              <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
                Step {item.step}
              </p>
              <p className="mt-2 text-lg font-semibold text-sand-900 dark:text-sand-50">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-sand-600 dark:text-sand-300">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="screenshots" className="space-y-6">
        <div className="space-y-2">
          <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
            Screenshots
          </p>
          <h2 className="text-2xl font-semibold text-sand-900 dark:text-sand-50">
            A calm workspace for sensitive evidence.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Vault list',
              src: '/screens/evvault-vault.svg',
            },
            {
              title: 'Capture flow',
              src: '/screens/evvault-capture.svg',
            },
            {
              title: 'Export bundle',
              src: '/screens/evvault-export.svg',
            },
          ].map((shot) => (
            <div
              key={shot.title}
              className="rounded-3xl border border-dashed border-sand-300/70 bg-white/70 p-4 shadow-[0_16px_32px_rgba(36,26,20,0.08)] dark:border-sand-700 dark:bg-sand-900/60"
            >
              <img
                src={shot.src}
                alt={shot.title}
                className="w-full rounded-2xl border border-sand-200/60 bg-white/80 dark:border-sand-700 dark:bg-sand-900/80"
              />
              <p className="ev-label mt-3 text-[0.55rem] text-sand-500 dark:text-sand-400">
                {shot.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="install" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Install Evidence Vault"
          description="Recommended for offline use after the first load."
        >
          <div className="space-y-4 text-sm text-sand-700 dark:text-sand-300">
            <ol className="space-y-3">
              <li>1. Open this site in Chrome, Edge, or Safari.</li>
              <li>2. Choose “Install app” or “Add to Home Screen.”</li>
              <li>3. Launch Evidence Vault from your home screen.</li>
            </ol>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => scrollToSection('tour')}>View feature tour</Button>
              <Button variant="outline" onClick={() => navigate('/vault/new')}>
                Create vault
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Safety note" description="Follow local laws and consent requirements.">
          <p className="text-sm text-sand-700 dark:text-sand-300">
            Avoid uploading sensitive evidence to unsafe channels. Keep originals secure and
            share only the minimum necessary for review.
          </p>
        </Card>
      </section>

      <section id="docs" className="space-y-6">
        <div className="space-y-2">
          <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">Docs</p>
          <h2 className="text-2xl font-semibold text-sand-900 dark:text-sand-50">
            Read the rationale and threat model.
          </h2>
          <p className="text-sm text-sand-600 dark:text-sand-300">
            Learn why this app is local-first, how custody logs work, and the limits of the MVP.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(githubUrl, '_blank', 'noopener,noreferrer')}
          >
            GitHub
          </Button>
          <Button onClick={() => scrollToSection('install')}>Install instructions</Button>
        </div>
      </section>
    </div>
  )
}
