import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

export default function ItemDetail() {
  const { id } = useParams()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Evidence item
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Item {id ?? 'unknown'}
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Review metadata, redact sensitive regions, and prepare for export.
        </p>
      </header>
      <Card title="Metadata" description="Captured details will live here.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">Add notes</Button>
          <Button variant="ghost">Open redaction</Button>
        </div>
      </Card>
    </div>
  )
}
