export const verifyHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Evidence Vault - Verify Export</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 32px; color: #1f2937; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      p { font-size: 14px; color: #4b5563; }
      .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-top: 16px; }
      label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; }
      input { margin-top: 6px; }
      button { margin-top: 12px; padding: 8px 12px; border-radius: 8px; border: 1px solid #111827; background: #111827; color: #fff; cursor: pointer; }
      pre { background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 12px; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>Verify Evidence Vault export</h1>
    <p>Select the exported <strong>manifest.json</strong>, <strong>custody_log.jsonl</strong>, and the files you want to verify.</p>

    <div class="card">
      <label>Manifest.json</label><br />
      <input id="manifestInput" type="file" accept="application/json" />
      <div style="margin-top: 12px;">
        <label>Custody log (custody_log.jsonl)</label><br />
        <input id="custodyInput" type="file" accept=".jsonl,application/json" />
      </div>
      <div style="margin-top: 12px;">
        <label>Exported files</label><br />
        <input id="fileInput" type="file" multiple />
      </div>
      <button id="verifyButton" type="button">Verify export</button>
    </div>

    <div class="card">
      <h2>Results</h2>
      <pre id="output">No verification yet.</pre>
    </div>

    <script src="./verify.js"></script>
  </body>
</html>
`

export const verifyJs = `(() => {
  const manifestInput = document.getElementById('manifestInput')
  const custodyInput = document.getElementById('custodyInput')
  const fileInput = document.getElementById('fileInput')
  const verifyButton = document.getElementById('verifyButton')
  const output = document.getElementById('output')

  const readFileText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result || '')
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })

  const toHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  const hashBuffer = async (buffer) => {
    if (!crypto || !crypto.subtle) {
      throw new Error('Web Crypto not available in this browser.')
    }
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return toHex(digest)
  }

  const hashText = async (text) => {
    const encoder = new TextEncoder()
    return hashBuffer(encoder.encode(text))
  }

  const hashFile = async (file) => {
    const buffer = await file.arrayBuffer()
    return hashBuffer(buffer)
  }

  const normalizeKey = (file) => file.webkitRelativePath || file.name

  const isRecord = (value) =>
    value && typeof value === 'object' && !Array.isArray(value)

  const toCanonical = (value) => {
    if (value === null) return null
    if (typeof value === 'string') return value
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'bigint') return value.toString()
    if (value && typeof value.toJSON === 'function') return toCanonical(value.toJSON())
    if (Array.isArray(value)) return value.map((entry) => toCanonical(entry))
    if (isRecord(value)) {
      const keys = Object.keys(value).sort()
      const result = {}
      keys.forEach((key) => {
        const entry = value[key]
        if (typeof entry !== 'undefined') {
          result[key] = toCanonical(entry)
        }
      })
      return result
    }
    return null
  }

  const canonicalStringify = (value) => JSON.stringify(toCanonical(value))

  const parseJsonLines = (text) => {
    const lines = text.split(/\\r?\\n/).filter(Boolean)
    const entries = []
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line))
      } catch (err) {
        entries.push({ parseError: true, raw: line })
      }
    }
    return entries
  }

  const verifyFiles = async (manifest, files) => {
    const entries = Array.isArray(manifest.files) ? manifest.files : []
    const expected = new Map()
    entries.forEach((entry) => {
      if (entry && entry.filename && entry.sha256) {
        expected.set(entry.filename, entry.sha256)
      }
    })

    const lines = []
    let okCount = 0
    for (const file of files) {
      const key = normalizeKey(file)
      const expectedHash =
        expected.get(key) || expected.get('media/' + file.name) || expected.get(file.name)
      if (!expectedHash) {
        lines.push(key + ': no matching entry in manifest')
        continue
      }
      const actual = await hashFile(file)
      if (actual === expectedHash) {
        okCount += 1
      }
      lines.push(key + ': ' + (actual === expectedHash ? 'OK' : 'MISMATCH'))
    }

    return { lines, okCount, total: files.length }
  }

  const verifyCustody = async (entries) => {
    const lines = []
    const grouped = {}

    for (const entry of entries) {
      if (!entry || entry.parseError || !entry.itemId) continue
      if (!grouped[entry.itemId]) grouped[entry.itemId] = []
      grouped[entry.itemId].push(entry)
    }

    const itemIds = Object.keys(grouped)
    if (itemIds.length === 0) {
      lines.push('No custody entries found.')
      return { lines, okCount: 0, total: 0 }
    }

    let okCount = 0
    for (const itemId of itemIds) {
      const list = grouped[itemId].slice().sort((a, b) => (a.ts || 0) - (b.ts || 0))
      let prev = null
      const issues = []

      for (const entry of list) {
        const computedCanonical = canonicalStringify({
          id: entry.id,
          itemId: entry.itemId,
          ts: entry.ts,
          action: entry.action,
          details: entry.details === undefined ? null : entry.details,
        })

        if (entry.canonical && entry.canonical !== computedCanonical) {
          issues.push('canonical mismatch at ' + entry.id)
        }

        const canonicalValue = entry.canonical || computedCanonical
        const expected = await hashText(String(prev || '') + String(canonicalValue))

        if (entry.exportPrevHashSha256 !== null && entry.exportPrevHashSha256 !== prev) {
          issues.push('prev hash mismatch at ' + entry.id)
        }

        if (entry.exportHashSha256 !== expected) {
          issues.push('hash mismatch at ' + entry.id)
        }

        prev = expected
      }

      if (issues.length === 0) {
        okCount += 1
        lines.push(itemId + ': OK (' + list.length + ' events)')
      } else {
        lines.push(itemId + ': FAIL (' + issues.length + ' issues)')
        issues.slice(0, 3).forEach((issue) => lines.push('  ' + issue))
      }
    }

    return { lines, okCount, total: itemIds.length }
  }

  verifyButton.addEventListener('click', async () => {
    const manifestFile = manifestInput.files && manifestInput.files[0]
    const custodyFile = custodyInput.files && custodyInput.files[0]
    const files = fileInput.files ? Array.from(fileInput.files) : []

    if (!manifestFile || !custodyFile || files.length === 0) {
      output.textContent =
        'Select manifest.json, custody_log.jsonl, and at least one file to verify.'
      return
    }

    try {
      const manifestText = await readFileText(manifestFile)
      const custodyText = await readFileText(custodyFile)
      const manifest = JSON.parse(manifestText)
      const custodyEntries = parseJsonLines(custodyText)

      const fileResults = await verifyFiles(manifest, files)
      const custodyResults = await verifyCustody(custodyEntries)

      const lines = []
      lines.push(
        'File hash check: ' + fileResults.okCount + '/' + fileResults.total + ' OK'
      )
      fileResults.lines.forEach((line) => lines.push(line))
      lines.push('')
      lines.push(
        'Custody chain check: ' +
          custodyResults.okCount +
          '/' +
          custodyResults.total +
          ' OK'
      )
      custodyResults.lines.forEach((line) => lines.push(line))

      output.textContent = lines.join('\\n')
    } catch (err) {
      output.textContent =
        'Verification failed: ' + (err && err.message ? err.message : err)
    }
  })
})()
`
