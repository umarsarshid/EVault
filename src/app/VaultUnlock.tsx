import { useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { unlockVault } from '../crypto/vault'
import { useVault } from './VaultContext'

export default function VaultUnlock() {
  const { setVaultStatus, setVaultKey, resetIdleTimer } = useVault()
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = passphrase.length > 0 && !isSubmitting

  const handleUnlock = async () => {
    if (!canSubmit) return

    setError(null)
    setIsSubmitting(true)

    try {
      const { vaultKey } = await unlockVault(passphrase)
      setVaultKey(vaultKey)
      setVaultStatus('unlocked')
      resetIdleTimer()
    } catch (err) {
      console.error(err)
      setError('Incorrect passphrase or missing vault.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <Input
            type="password"
            placeholder="Passphrase"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
          />
          {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleUnlock} disabled={!canSubmit}>
              {isSubmitting ? 'Unlocking...' : 'Unlock'}
            </Button>
            <Button variant="outline" disabled={isSubmitting}>
              Use another vault
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
