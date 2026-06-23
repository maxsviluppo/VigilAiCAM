# Crea archivio release Vigil.AI V2 per OTA (Windows)
# Uso: .\scripts\publish_release.ps1 -Version 2.0.1 -GitHubUser TUO-UTENTE
param(
  [string]$Version = "2.0.1",
  [string]$GitHubUser = "TUO-UTENTE",
  [string]$Repo = "vigilai-raspberry"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Archive = "vigilai-raspberry-$Version.tar.gz"
$OutDir = Join-Path $Root "releases"
$Stage = Join-Path $OutDir "stage-vigilai-raspberry-$Version"

if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
if (Test-Path (Join-Path $OutDir $Archive)) { Remove-Item (Join-Path $OutDir $Archive) -Force }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

$ExcludeDirs = @("node_modules", "dist", ".git", "releases", "logs")
$ExcludeFiles = @(".env", ".env.bak", ".update-status.json")

Get-ChildItem -Path $Root -Force | ForEach-Object {
  if ($ExcludeDirs -contains $_.Name) { return }
  if ($ExcludeFiles -contains $_.Name) { return }
  if ($_.Extension -eq ".log") { return }
  Copy-Item -Path $_.FullName -Destination (Join-Path $Stage $_.Name) -Recurse -Force
}

$PkgPath = Join-Path $Stage "package.json"
$Pkg = Get-Content $PkgPath -Raw | ConvertFrom-Json
$Pkg.version = $Version
$Pkg | ConvertTo-Json -Depth 10 | Set-Content $PkgPath -Encoding UTF8

Push-Location $OutDir
try {
  tar -czf $Archive "stage-vigilai-raspberry-$Version"
} finally {
  Pop-Location
}

Remove-Item $Stage -Recurse -Force

$ArchivePath = Join-Path $OutDir $Archive
$Sha = (Get-FileHash -Path $ArchivePath -Algorithm SHA256).Hash.ToLower()
$ManifestPath = Join-Path $OutDir "version-$Version.json"

@{
  version = $Version
  url = "https://github.com/$GitHubUser/$Repo/releases/download/v$Version/$Archive"
  sha256 = $Sha
  changelog = "Release Vigil.AI Raspberry v$Version - OTA, chiavi API AQ, layout 3.5 aggiornato."
  critical = $false
} | ConvertTo-Json -Depth 5 | Set-Content $ManifestPath -Encoding UTF8

Write-Host "Creato: $ArchivePath"
Write-Host "SHA256: $Sha"
Write-Host "Manifest: $ManifestPath"
