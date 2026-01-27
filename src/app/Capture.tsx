import Button from '../components/Button'
import Card from '../components/Card'

export default function Capture() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600">Capture</p>
        <h1 className="text-3xl font-semibold text-sand-900">Record new evidence</h1>
        <p className="text-sm text-sand-700">
          Capture photo, video, audio, or written testimony while offline.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {['Photo', 'Video', 'Audio'].map((label) => (
          <Card key={label} title={label} description="Capture and encrypt locally.">
            <Button className="w-full">Start {label.toLowerCase()}</Button>
          </Card>
        ))}
      </div>
      <Card title="Written testimony" description="Document what happened in your own words.">
        <Button variant="outline">Write testimony</Button>
      </Card>
    </div>
  )
}
