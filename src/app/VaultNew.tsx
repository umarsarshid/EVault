import { useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { createVault } from '../crypto/vault'
import { useVault } from './VaultContext'

export default function VaultNew() {
  const { setVaultStatus } = useVault()
  const [vaultName, setVaultName] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passphraseMismatch = passphrase.length > 0 && confirm.length > 0 && passphrase !== confirm
  const canSubmit =
    vaultName.trim().length > 0 && passphrase.length > 0 && !passphraseMismatch && !isSubmitting

  const handleCreate = async () => {
    if (!canSubmit) return

    setError(null)
    setIsSubmitting(true)

    try {
      await createVault({ vaultName: vaultName.trim(), passphrase })
      setVaultStatus('unlocked')
    } catch (err) {
      console.error(err)
      setError('Unable to create vault. Please try again.')
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
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Create a new vault
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Choose a strong passphrase. It will be required to unlock and export evidence.
        </p>
      </header>
      <Card title="Vault details" description="Store everything encrypted on this device.">
        <div className="space-y-4">
          <Input
            placeholder="Vault name"
            value={vaultName}
            onChange={(event) => setVaultName(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Passphrase"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm passphrase"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
            If you forget your passphrase, your data is unrecoverable.
          </p>
          {passphraseMismatch && (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              Passphrases do not match.
            </p>
          )}
          {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCreate} disabled={!canSubmit}>
              {isSubmitting ? 'Creating...' : 'Create vault'}
            </Button>
            <Button variant="ghost" disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
