import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

export default function VaultNew() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600">Vault</p>
        <h1 className="text-3xl font-semibold text-sand-900">Create a new vault</h1>
        <p className="text-sm text-sand-700">
          Choose a strong passphrase. It will be required to unlock and export evidence.
        </p>
      </header>
      <Card title="Vault details" description="Store everything encrypted on this device.">
        <div className="space-y-4">
          <Input placeholder="Vault name" />
          <Input type="password" placeholder="Passphrase" />
          <Input type="password" placeholder="Confirm passphrase" />
          <div className="flex flex-wrap gap-3">
            <Button>Create vault</Button>
            <Button variant="ghost">Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
