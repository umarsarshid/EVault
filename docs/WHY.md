# Why Evidence Vault

Evidence Vault exists to make safe, offline documentation possible without a server or account.
The app is meant for people who need to capture media or testimony when connectivity is limited,
who cannot risk cloud uploads, and who need a clear chain-of-custody trail when sharing with
lawyers or journalists.

This is an MVP. The priority is reliability, transparency, and local control, not advanced
automation or cloud features.

## What this website is for

- A free, installable download (PWA) that works offline after first load.
- A local vault where evidence is encrypted at rest and never leaves the device unless exported.
- A human-readable export bundle that can be verified without any server.

## Design principles

- Local-first: capture and storage always work offline.
- Explicit over implicit: users choose what gets captured and exported.
- Verifiable exports: hashes + custody logs are readable and checkable in any browser.
- Minimized risk: no cloud sync, no auto-redaction, no stealth mode in MVP.

## Why these tools

### Vite + React + TypeScript
- Vite keeps builds fast and makes a static, host-anywhere site.
- React lets us compose the capture, vault, and export flows cleanly.
- TypeScript catches subtle bugs in cryptography and export logic early.

### Tailwind CSS
- Fast iteration on complex layouts without custom CSS bloat.
- Consistent spacing, typography, and components across the app.

### Dexie + IndexedDB
- IndexedDB is the most reliable browser storage for large binary blobs.
- Dexie provides schema, indexes, and migrations with a simple API.

### libsodium
- Proven cryptography primitives in the browser.
- Argon2id for passphrase hardening, secretbox for authenticated encryption,
  and Ed25519 signatures for custody logs.

### fflate
- Small, fast ZIP generation in the browser.
- Enables a portable export bundle without a backend.

### vite-plugin-pwa
- Generates the service worker and manifest for installable offline use.
- Provides reliable offline caching after the first load.

## Why the export format looks the way it does

- `manifest.json` + `manifest.csv` provide human- and machine-readable hashes.
- `custody_log.jsonl` is append-only and easy to inspect line by line.
- `verify/verify.html` runs locally so lawyers and journalists can check integrity
  without installing software or trusting a server.

## Known limitations (by design)

- No cloud sync or sharing in the MVP.
- No automated face/plate detection.
- No disguised or covert modes.

These choices keep the scope safe, audit-friendly, and appropriate for a free download.
