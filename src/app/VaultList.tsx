import Button from '../components/Button'
import Card from '../components/Card'

export default function VaultList() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Vault
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Your evidence
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Items captured offline will appear here once the vault is unlocked.
        </p>
      </header>
      <Card title="No evidence yet" description="Capture media or write testimony to begin.">
        <div className="flex flex-wrap gap-3">
          <Button>Capture</Button>
          <Button variant="outline">Testimony</Button>
          <Button variant="ghost">Export</Button>
        </div>
      </Card>
    </div>
  )
}
