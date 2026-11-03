$ErrorActionPreference = 'Stop'
# Backwards-compatible wrapper. Prefer `node package_submission.mjs` when PS scripts are disabled.
Push-Location $PSScriptRoot
try {
    & node (Join-Path $PSScriptRoot 'package_submission.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Submission packaging failed' }
} finally { Pop-Location }
