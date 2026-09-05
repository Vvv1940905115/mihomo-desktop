Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "resources\icon.png"
$dst = Join-Path $PSScriptRoot "resources\icon.ico"

$img = [System.Drawing.Image]::FromFile($src)
$sizes = @(16, 24, 32, 48, 64, 128, 256)

$pngs = @()
foreach ($s in $sizes) {
    $b = [System.Drawing.Bitmap]::new($img, $s, $s)
    $m = [System.IO.MemoryStream]::new()
    $b.Save($m, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += , $m.ToArray()
    $m.Dispose()
    $b.Dispose()
}
$img.Dispose()

$out = [System.IO.MemoryStream]::new()
$bw = [System.IO.BinaryWriter]::new($out)

$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)

$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $w = if ($s -ge 256) { 0 } else { $s }
    $bw.Write([Byte]$w)
    $bw.Write([Byte]$w)
    $bw.Write([Byte]0)
    $bw.Write([Byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$pngs[$i].Length)
    $bw.Write([UInt32]$offset)
    $offset += $pngs[$i].Length
}

foreach ($p in $pngs) { $bw.Write($p) }

$bw.Flush()
[System.IO.File]::WriteAllBytes($dst, $out.ToArray())
$bw.Dispose()
$out.Dispose()

Write-Host "icon.ico generated:" $dst
