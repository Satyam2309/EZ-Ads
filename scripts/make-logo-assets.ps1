# Regenerates all brand lockup and mark assets from the supplied artwork.
# Generates transparent-background PNGs tuned for light and dark themes.
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
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Source: $srcPath ($($src.Width)x$($src.Height))"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

# 1. Full Lockup (Light & Dark)
$w = $Width
$h = [int][Math]::Round($src.Height * $w / $src.Width)

$base = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($base)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, $w, $h)
$g.Dispose()

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$read = $base.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$pixels = New-Object byte[] ($read.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($read.Scan0, $pixels, 0, $pixels.Length)
$base.UnlockBits($read)
$base.Dispose()

$light = New-Object byte[] $pixels.Length
$dark = New-Object byte[] $pixels.Length

for ($i = 0; $i -lt $pixels.Length; $i += 4) {
    $b = [double]$pixels[$i]
    $gr = [double]$pixels[$i + 1]
    $r = [double]$pixels[$i + 2]
    
    $min = [Math]::Min($r, [Math]::Min($gr, $b))
    
    if ($min -ge 249.0) {
        $light[$i + 3] = 0
        $dark[$i + 3] = 0
        continue
    }
    
    $bgVal = 254.0
    $alphaNorm = [Math]::Max(0.0, [Math]::Min(1.0, ($bgVal - $min) / $bgVal))
    if ($alphaNorm -lt 0.04) {
        $light[$i + 3] = 0
        $dark[$i + 3] = 0
        continue
    }
    
    $aByte = [byte][Math]::Round($alphaNorm * 255.0)
    
    $origB = [Math]::Max(0.0, [Math]::Min(255.0, ($b - $bgVal * (1.0 - $alphaNorm)) / $alphaNorm))
    $origGr = [Math]::Max(0.0, [Math]::Min(255.0, ($gr - $bgVal * (1.0 - $alphaNorm)) / $alphaNorm))
    $origR = [Math]::Max(0.0, [Math]::Min(255.0, ($r - $bgVal * (1.0 - $alphaNorm)) / $alphaNorm))
    
    # Light Mode
    $light[$i] = [byte][Math]::Round($origB)
    $light[$i + 1] = [byte][Math]::Round($origGr)
    $light[$i + 2] = [byte][Math]::Round($origR)
    $light[$i + 3] = $aByte
    
    # Dark Mode
    $maxOrig = [Math]::Max($origR, [Math]::Max($origGr, $origB))
    if ($maxOrig -lt 68.0) {
        # Crisp white for tagline and network nodes
        $dark[$i] = 255
        $dark[$i + 1] = 255
        $dark[$i + 2] = 255
        $dark[$i + 3] = $aByte
    } else {
        if ($origB -gt $origR + 30.0) {
            $dark[$i] = [byte][Math]::Min(255.0, $origB * 1.15 + 15.0)
            $dark[$i + 1] = [byte][Math]::Min(255.0, $origGr * 1.15 + 10.0)
            $dark[$i + 2] = [byte][Math]::Min(255.0, $origR * 1.15)
        } elseif ($origR -gt $origB + 30.0) {
            $dark[$i] = [byte][Math]::Min(255.0, $origB * 1.1)
            $dark[$i + 1] = [byte][Math]::Min(255.0, $origGr * 1.1 + 10.0)
            $dark[$i + 2] = [byte][Math]::Min(255.0, $origR * 1.05 + 5.0)
        } else {
            $dark[$i] = [byte][Math]::Round($origB)
            $dark[$i + 1] = [byte][Math]::Round($origGr)
            $dark[$i + 2] = [byte][Math]::Round($origR)
        }
        $dark[$i + 3] = $aByte
    }
}

$lightBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$w1 = $lightBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($light, 0, $w1.Scan0, $light.Length)
$lightBmp.UnlockBits($w1)
$lightBmp.Save((Join-Path $OutDir "brand-lockup.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$lightBmp.Dispose()

$darkBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$w2 = $darkBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($dark, 0, $w2.Scan0, $dark.Length)
$darkBmp.UnlockBits($w2)
$darkBmp.Save((Join-Path $OutDir "brand-lockup-dark.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$darkBmp.Dispose()

# 2. Brand Mark Only
$cropX = 130
$cropY = 160
$cropW = 875 - $cropX
$cropH = 585 - $cropY

$markTargetW = 400
$markTargetH = [int][Math]::Round($cropH * $markTargetW / $cropW)

$markBase = New-Object System.Drawing.Bitmap($markTargetW, $markTargetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gm = [System.Drawing.Graphics]::FromImage($markBase)
$gm.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gm.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gm.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $markTargetW, $markTargetH)), (New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)), [System.Drawing.GraphicsUnit]::Pixel)
$gm.Dispose()
$src.Dispose()

$markRect = New-Object System.Drawing.Rectangle(0, 0, $markTargetW, $markTargetH)
$mRead = $markBase.LockBits($markRect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mPixels = New-Object byte[] ($mRead.Stride * $markTargetH)
[System.Runtime.InteropServices.Marshal]::Copy($mRead.Scan0, $mPixels, 0, $mPixels.Length)
$markBase.UnlockBits($mRead)
$markBase.Dispose()

$mLight = New-Object byte[] $mPixels.Length
$mDark = New-Object byte[] $mPixels.Length

for ($i = 0; $i -lt $mPixels.Length; $i += 4) {
    $b = [double]$mPixels[$i]
    $gr = [double]$mPixels[$i + 1]
    $r = [double]$mPixels[$i + 2]
    
    $min = [Math]::Min($r, [Math]::Min($gr, $b))
    
    if ($min -ge 249.0) {
        $mLight[$i + 3] = 0
        $mDark[$i + 3] = 0
        continue
    }
    
    $bgVal = 254.0
    $alphaNorm = [Math]::Max(0.0, [Math]::Min(1.0, ($bgVal - $min) / $bgVal))
    if ($alphaNorm -lt 0.04) {
        $mLight[$i + 3] = 0
        $mDark[$i + 3] = 0
        continue
    }
    
    $aByte = [byte][Math]::Round($alphaNorm * 255.0)
    
    $origB = [Math]::Max(0.0, [Math]::Min(255.0, ($b - $bgVal * (1.0 - $alphaNorm)) / $alphaNorm))
    $origGr = [Math]::Max(0.0, [Math]::Min(255.0, ($gr - $bgVal * (1.0 - $alphaNorm)) / $alphaNorm))
    $origR = [Math]::Max(0.0, [Math]::Min(255.0, ($r - $bgVal * (1.0 - $alphaNorm)) / $alphaNorm))
    
    $mLight[$i] = [byte][Math]::Round($origB)
    $mLight[$i + 1] = [byte][Math]::Round($origGr)
    $mLight[$i + 2] = [byte][Math]::Round($origR)
    $mLight[$i + 3] = $aByte
    
    $maxOrig = [Math]::Max($origR, [Math]::Max($origGr, $origB))
    if ($maxOrig -lt 68.0) {
        $mDark[$i] = 255
        $mDark[$i + 1] = 255
        $mDark[$i + 2] = 255
        $mDark[$i + 3] = $aByte
    } else {
        if ($origB -gt $origR + 30.0) {
            $mDark[$i] = [byte][Math]::Min(255.0, $origB * 1.15 + 15.0)
            $mDark[$i + 1] = [byte][Math]::Min(255.0, $origGr * 1.15 + 10.0)
            $mDark[$i + 2] = [byte][Math]::Min(255.0, $origR * 1.15)
        } elseif ($origR -gt $origB + 30.0) {
            $mDark[$i] = [byte][Math]::Min(255.0, $origB * 1.1)
            $mDark[$i + 1] = [byte][Math]::Min(255.0, $origGr * 1.1 + 10.0)
            $mDark[$i + 2] = [byte][Math]::Min(255.0, $origR * 1.05 + 5.0)
        } else {
            $mDark[$i] = [byte][Math]::Round($origB)
            $mDark[$i + 1] = [byte][Math]::Round($origGr)
            $mDark[$i + 2] = [byte][Math]::Round($origR)
        }
        $mDark[$i + 3] = $aByte
    }
}

$mLightBmp = New-Object System.Drawing.Bitmap($markTargetW, $markTargetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mw1 = $mLightBmp.LockBits($markRect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($mLight, 0, $mw1.Scan0, $mLight.Length)
$mLightBmp.UnlockBits($mw1)
$mLightBmp.Save((Join-Path $OutDir "brand-mark.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$mLightBmp.Dispose()

$mDarkBmp = New-Object System.Drawing.Bitmap($markTargetW, $markTargetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mw2 = $mDarkBmp.LockBits($markRect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[System.Runtime.InteropServices.Marshal]::Copy($mDark, 0, $mw2.Scan0, $mDark.Length)
$mDarkBmp.UnlockBits($mw2)
$mDarkBmp.Save((Join-Path $OutDir "brand-mark-dark.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$mDarkBmp.Dispose()

Write-Output "All brand assets generated cleanly."
