import Button from '../components/Button'
import Card from '../components/Card'

export default function VaultList() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600">Vault</p>
        <h1 className="text-3xl font-semibold text-sand-900">Your evidence</h1>
        <p className="text-sm text-sand-700">
          Items captured offline will appear here once the vault is unlocked.
        </p>
      </header>
      <Card title="No items yet" description="Capture media or write testimony to begin.">
        <div className="flex flex-wrap gap-3">
          <Button>Start capture</Button>
          <Button variant="outline">Write testimony</Button>
        </div>
      </Card>
    </div>
  )
}
