# Regenerate USER_MANUAL.docx and USER_MANUAL.pdf from USER_MANUAL.md
#
# Prerequisites (one-time):
#   winget install JohnMacFarlane.Pandoc
#   winget install wkhtmltopdf.wkhtmltox
#
# Run from repo root or from this folder:
#   pwsh -File docs/export-user-manual.ps1

$ErrorActionPreference = "Stop"
$DocDir = $PSScriptRoot
$Md = Join-Path $DocDir "USER_MANUAL.md"

if (-not (Test-Path $Md)) {
  throw "Missing $Md"
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
  throw "Pandoc not found. Install: winget install JohnMacFarlane.Pandoc (then reopen the terminal)."
}

$wkCandidates = @(
  "C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
  "C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe"
)
$wk = $wkCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $wk) {
  $wk = "wkhtmltopdf"
}

Write-Host "Writing USER_MANUAL.docx ..."
& pandoc $Md -o (Join-Path $DocDir "USER_MANUAL.docx") --from markdown --standalone

Write-Host "Writing USER_MANUAL.pdf (engine: $wk) ..."
& pandoc $Md -o (Join-Path $DocDir "USER_MANUAL.pdf") --from markdown --standalone --pdf-engine=$wk

Write-Host "Done."
