# Builds deploy.zip for Node.js hosting (GoDaddy Node.js Hosting, Render, etc).
#
# The repo root holds large local-only artifacts (tmp/ffmpeg ~80 MB, screenshot*.png,
# preview/, scratch txt/json dumps), and node_modules/.env must never ship. Instead of
# hand-maintaining exclusions, this stages only what the server needs, then zips it.
#
# package.json sits at the archive root, which is what the host expects.
# Run with: npm run pack:deploy

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
# Staging inside the repo: $env:TEMP here is a short path (C:\Users\MYPC~1\...)
# that PowerShell does not resolve reliably.
$stage = Join-Path $root '.deploy-stage'
$zip = Join-Path $root 'deploy.zip'

$items = @('package.json', 'package-lock.json', 'README.md', 'render.yaml', 'server', 'client')

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null

foreach ($item in $items) {
  $src = Join-Path $root $item
  if (-not (Test-Path $src)) { Write-Host "skip (missing): $item"; continue }
  if (Test-Path $src -PathType Leaf) {
    Copy-Item $src (Join-Path $stage $item) -Force
    continue
  }
  # robocopy's destination must be a directory, so single files use Copy-Item above.
  robocopy $src (Join-Path $stage $item) /E /NFL /NDL /NJH /NJS /NP `
    /XD node_modules .vite dist coverage .git /XF *.log .env .env.* | Out-Null
  # robocopy: 0-7 means success (1 = files copied), 8+ means failure.
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $item (exit $LASTEXITCODE)" }
}

# Belt and braces: no secrets, no prebuilt client, no stray logs in the bundle.
Get-ChildItem $stage -Recurse -Force -File -Include '.env', '.env.*', '*.log' -EA SilentlyContinue |
  Remove-Item -Force
$dist = Join-Path $stage 'client/dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal -Force

$size = (Get-Item $zip).Length / 1MB
Write-Host ("deploy.zip ready: {0:N1} MB at {1}" -f $size, $zip)
