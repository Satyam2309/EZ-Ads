# Regenerates the brand lockup images from the supplied artwork.
#
#   materials/app logo/WebHeaderLogo.png  (mark + wordmark + tagline, on white)
#     -> client/public/brand-lockup.png        colours untouched, white lifted to transparency
#     -> client/public/brand-lockup-plate.png  the artwork exactly as supplied, white included
#
# Nothing is redrawn or recoloured: both files are plain downscales of the supplied
# PNG. The first only un-composites the white background (alpha = 255 - min(r,g,b),
# colour rescaled by that alpha), which is mathematically exact for art drawn on a
# white plate. The second keeps the white background, so the black tagline and
# network dots stay visible on the dark canvas — recolouring them to white would
# change the brand colours.
#
# Run: npm run logo:build
param(
  [string]$Source = (Join-Path $PSScriptRoot '..\materials\app logo\WebHeaderLogo.png'),
  [string]$OutDir = (Join-Path $PSScriptRoot '..\client\public'),
  [int]$Width = 560
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path $Source).Path
$img = [System.Drawing.Image]::FromFile($srcPath)
$w = $Width
$h = [int][Math]::Round($img.Height * $Width / $img.Width)

# Downscale only. The lockup is shown at 36-48px tall, so 560px wide (187px tall)
# still covers 3x retina while keeping the file small.
$base = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($base)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($img, 0, 0, $w, $h)
$g.Dispose()
$img.Dispose()

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$platePath = Join-Path $OutDir 'brand-lockup-plate.png'
$base.Save($platePath, [System.Drawing.Imaging.ImageFormat]::Png)

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$read = $base.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$pixels = New-Object byte[] ($read.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($read.Scan0, $pixels, 0, $pixels.Length)
$base.UnlockBits($read)
$base.Dispose()

$light = New-Object byte[] $pixels.Length
$transparent = 0
for ($i = 0; $i -lt $pixels.Length; $i += 4) {
  $b = [int]$pixels[$i]; $gr = [int]$pixels[$i + 1]; $r = [int]$pixels[$i + 2]
  $min = [Math]::Min($r, [Math]::Min($gr, $b))
  $a = 255 - $min
  if ($a -le 0) { $transparent++; continue }   # pure white -> fully transparent
  $light[$i] = [byte][Math]::Min(255, [int](($b - $min) * 255 / $a))
  $light[$i + 1] = [byte][Math]::Min(255, [int](($gr - $min) * 255 / $a))
  $light[$i + 2] = [byte][Math]::Min(255, [int](($r - $min) * 255 / $a))
  $light[$i + 3] = [byte]$a
}

$cut = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$write = $cut.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($light, 0, $write.Scan0, $light.Length)
$cut.UnlockBits($write)
$cutPath = Join-Path $OutDir 'brand-lockup.png'
$cut.Save($cutPath, [System.Drawing.Imaging.ImageFormat]::Png)
$cut.Dispose()

"{0} -> {1}x{2}, {3:P1} of pixels transparent" -f $srcPath, $w, $h, ($transparent / ($w * $h)) | Write-Output
Get-ChildItem $cutPath, $platePath | ForEach-Object { "{0}  {1:N1} KB" -f $_.Name, ($_.Length / 1KB) } | Write-Output
