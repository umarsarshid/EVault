import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useVault } from './VaultContext'

export default function VaultUnlock() {
  const { setVaultStatus } = useVault()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Vault
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">Unlock vault</h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Enter your passphrase to access locally stored evidence.
        </p>
      </header>
      <Card title="Enter passphrase" description="No network access required.">
        <div className="space-y-4">
          <Input type="password" placeholder="Passphrase" />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setVaultStatus('unlocked')}>Unlock</Button>
            <Button variant="outline">Use another vault</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
