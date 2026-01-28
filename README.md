# Evidence Vault (MVP)

Offline-first, locally encrypted evidence capture in a single installable PWA. Nothing leaves the device unless you export it.

## Quick start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Tests

```bash
pnpm test
```

## Demo mode (portfolio)

Use the “Enter demo vault” button on the landing page to load a safe, fake dataset in a
separate local database. Demo data never mixes with real vault data. Use “Exit demo” in the
header to return to the real vault.

## Deployment (portfolio site)

Build the app as static files and host anywhere (Netlify, Vercel, GitHub Pages, or a simple
static file server).

```bash
pnpm build
```

The output is in `dist/`. Upload the contents of that folder to your host.

### Download / Install

- **Install as App (recommended):** visit the site on mobile or desktop and use the browser’s
  “Install App” prompt. This enables offline use after the first load.
- **Download Export Verifier (optional):** provide a direct link to the exported
  `verify.html` + `verify.js` files from a bundle for reviewers who want a standalone checker.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Dexie (IndexedDB)
- libsodium (client-side crypto)
- fflate (ZIP exports)
- vite-plugin-pwa (offline caching + installable app)

## Why this exists

Evidence Vault is designed for offline-first documentation when cloud uploads are unsafe or
impossible. The MVP focuses on local control, explicit user actions, and verifiable exports.

See `docs/WHY.md` for the full rationale and tool choices.

## What this app is / isn't

**This app is:**
- A local-only, offline-first evidence vault you can install as a PWA.
- A tool for capturing media or written testimony with metadata.
- A way to export an encrypted, tamper-evident bundle for legal review.

**This app is not:**
- A cloud backup or sharing service.
- A stealth or disguise tool.
- An automatic redaction or face-detection product.
- A guaranteed legal safe harbor.

## Threat model (MVP)

**In scope:**
- **Device theft risk:** protects data at rest with local encryption; assumes attacker does not know the passphrase.
- **Casual tampering:** detects basic modification of exported files via hash chaining and verification.
- **Low/no connectivity:** works fully offline; no network required to capture, store, or verify exports.

**Out of scope (for MVP):**
- Targeted device compromise (malware, keyloggers, spyware).
- Live coercion or surveillance of the user.
- Forensics-grade adversaries with device-level access while unlocked.

## Legal & consent

You are responsible for complying with local laws on recording, consent, and data handling. Do not upload sensitive evidence to unsafe channels or share it without appropriate legal guidance.

## Crypto notes (MVP)

- Passphrase is stretched with Argon2id (libsodium `crypto_pwhash`).
- A random vault key encrypts content; it is wrapped with the passphrase-derived master key.
- A signing keypair (Ed25519) is generated for custody logs; the private key is wrapped with the vault key.
- The decrypted vault key is kept in memory only and wiped on lock; auto-lock is a placeholder timer.

## Capture notes

- The capture flow supports photo, video, audio, and text-only testimony.
- Media is encrypted client-side before being saved to IndexedDB.

## Custody log notes

- Each custody event is canonicalized (stable JSON field ordering) before hashing.
- Events are hash-chained per item (`hash = H(prevHash + canonicalPayload)`).
- Each event hash is signed with the vault’s Ed25519 key; signatures are stored with events.
- Exports include a `custody_log.jsonl` with per-event canonical payload + export-time hash chain.

## Export bundle

- ZIP format: `EvidenceVault_Export_YYYYMMDD/`
  - `README.txt`
  - `manifest.json` + `manifest.csv`
  - `custody_log.jsonl`
  - `media/` (originals and/or redacted files)
  - `verify/verify.html` + `verify/verify.js` (offline verification)
- `verify.html` runs locally in a browser and checks:
  - File hashes match `manifest.json`
  - Custody chain integrity using the export-time hash chain fields
