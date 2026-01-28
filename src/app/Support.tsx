import Button from '../components/Button'
import Card from '../components/Card'

const supportUrl =
  (import.meta.env.VITE_SUPPORT_URL as string | undefined) ??
  'https://buymeacoffee.com/umararshid'

const hasSupportUrl = Boolean(supportUrl && /^https?:\/\//i.test(supportUrl))

export default function Support() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">Support</p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Buy me a coffee
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          If this project helped, you can support continued work with a small tip.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Scan to support"
          description="Use your phone camera or payment app to scan the QR code."
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-dashed border-sand-300/70 bg-white/70 p-4 text-center dark:border-sand-700 dark:bg-sand-900/60">
              <img
                src="/support/evvault-coffee.png"
                alt="Support QR code"
                className="mx-auto w-full max-w-xs rounded-2xl border border-sand-200/60 bg-white/80 p-3 shadow-[0_12px_30px_rgba(36,26,20,0.12)] dark:border-sand-700 dark:bg-sand-900/80"
                onError={(event) => {
                  event.currentTarget.src = '/support/qr-placeholder.svg'
                }}
              />
            </div>
            <p className="text-xs text-sand-600 dark:text-sand-400">
              Replace the placeholder with your QR image at
              <span className="font-semibold"> public/support/evvault-coffee.png</span>.
            </p>
          </div>
        </Card>

        <Card title="Why support?" description="A small note for visitors.">
          <div className="space-y-4 text-sm text-sand-700 dark:text-sand-300">
            <p>
              Evidence Vault is built to be free and local-first. Your support helps fund
              maintenance, security reviews, and new features.
            </p>
            <ul className="space-y-2">
              <li>• Offline safety improvements</li>
              <li>• Export verification tooling</li>
              <li>• Accessibility and translations</li>
            </ul>
            {hasSupportUrl && (
              <Button
                onClick={() => window.open(supportUrl, '_blank', 'noopener,noreferrer')}
              >
                Open support link
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
