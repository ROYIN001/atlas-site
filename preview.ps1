$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webp" = "image/webp"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".md"   = "text/markdown; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$port = 0
foreach ($p in 8000..8010) {
  try {
    $listener.Prefixes.Clear()
    $listener.Prefixes.Add("http://localhost:$p/")
    $listener.Start()
    $port = $p
    break
  } catch {
    $listener.Prefixes.Clear()
  }
}
if ($port -eq 0) {
  Write-Host "Could not open a port between 8000 and 8010." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

$url = "http://localhost:$port/"
Write-Host ""
Write-Host "  Atlas preview is running at $url" -ForegroundColor Green
Write-Host "  Serving files from: $root"
Write-Host "  Close this window (or press Ctrl+C) to stop the server."
Write-Host ""
Start-Process $url

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($rel -eq "/") { $rel = "/index.html" }
    $file = Join-Path $root ($rel.TrimStart("/").Replace("/", "\"))

    $full = [System.IO.Path]::GetFullPath($file)
    if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root))) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.Close()
      continue
    }

    if (Test-Path -LiteralPath $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      else { $ctx.Response.ContentType = "application/octet-stream" }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  }
} finally {
  $listener.Stop()
}
