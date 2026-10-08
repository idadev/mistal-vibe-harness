# Usage:
#   scripts/install.ps1 -Target <project> [-Link]   -> <project>\.vibe\
#   scripts/install.ps1 -Global [-Link]             -> $env:VIBE_HOME or ~\.vibe
# -Link creates symlinks (needs developer mode or admin on Windows).
param([string]$Target, [switch]$Global, [switch]$Link)
if ($Global -eq [bool]$Target) { throw "Specify exactly one of -Target <project> or -Global" }
$src = Split-Path $PSScriptRoot -Parent
if ($Global) {
  $root = if ($env:VIBE_HOME) { $env:VIBE_HOME } else { Join-Path $HOME ".vibe" }
} else { $root = Join-Path $Target ".vibe" }
foreach ($d in 'skills','agents','prompts') {
  $out = Join-Path $root $d
  New-Item -ItemType Directory -Force $out | Out-Null
  Get-ChildItem (Join-Path $src $d) | ForEach-Object {
    $dest = Join-Path $out $_.Name
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    if ($Link) { New-Item -ItemType SymbolicLink -Path $dest -Target $_.FullName | Out-Null }
    else { Copy-Item -Recurse $_.FullName $dest }
  }
}
Write-Host "Installed into $root"
