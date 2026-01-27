import Button from '../components/Button'
import Card from '../components/Card'

export default function Export() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600">Export</p>
        <h1 className="text-3xl font-semibold text-sand-900">Prepare an export bundle</h1>
        <p className="text-sm text-sand-700">
          Generate a ZIP with originals, redactions, a manifest, and verification file.
        </p>
      </header>
      <Card title="Bundle settings" description="Pick what to include in the export.">
        <div className="flex flex-wrap gap-3">
          <Button>Build ZIP bundle</Button>
          <Button variant="outline">Review manifest</Button>
        </div>
      </Card>
    </div>
  )
}
