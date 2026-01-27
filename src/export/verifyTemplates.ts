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
      button { margin-top: 12px; padding: 8px 12px; border-radius: 8px; border: 1px solid #111827; background: #111827; color: #fff; cursor: pointer; }
      pre { background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 12px; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>Verify Evidence Vault export</h1>
    <p>Select the exported <strong>manifest.json</strong> and the files you want to verify.</p>

    <div class="card">
      <label>Manifest.json</label><br />
      <input id="manifestInput" type="file" accept="application/json" />
      <div style="margin-top: 12px;">
        <label>Exported files</label><br />
        <input id="fileInput" type="file" multiple />
      </div>
      <button id="verifyButton" type="button">Verify files</button>
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

  const hashFile = async (file) => {
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return toHex(digest)
  }

  const normalizeKey = (file) => file.webkitRelativePath || file.name

  verifyButton.addEventListener('click', async () => {
    const manifestFile = manifestInput.files && manifestInput.files[0]
    const files = fileInput.files ? Array.from(fileInput.files) : []

    if (!manifestFile || files.length === 0) {
      output.textContent = 'Select manifest.json and at least one file to verify.'
      return
    }

    try {
      const manifestText = await readFileText(manifestFile)
      const manifest = JSON.parse(manifestText)
      const entries = Array.isArray(manifest.files) ? manifest.files : []
      const expected = new Map(entries.map((entry) => [entry.filename, entry.sha256]))

      const results = []
      for (const file of files) {
        const key = normalizeKey(file)
        const expectedHash = expected.get(key) || expected.get(`media/${file.name}`) || expected.get(file.name)
        if (!expectedHash) {
          results.push(`${key}: no matching entry in manifest`)
          continue
        }
        const actual = await hashFile(file)
        results.push(`${key}: ${actual === expectedHash ? 'OK' : 'MISMATCH'}`)
      }

      output.textContent = results.join('\\n') || 'No files verified.'
    } catch (err) {
      output.textContent = 'Verification failed: ' + (err && err.message ? err.message : err)
    }
  })
})()
`
