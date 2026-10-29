# Usage:
#   scripts/install.ps1 -Target <project> [-Link] [-Agents <types>] [-Hooks] [-Force] -> <project>\.vibe\
#   scripts/install.ps1 -Global [-Link]                                        -> $env:VIBE_HOME or ~\.vibe
# -Link creates symlinks (needs developer mode or admin on Windows).
# -Agents composes <project>\AGENTS.md from templates\ (types: api-spec,api-impl,kafka,database).
# -Hooks writes <project>\.vibe\hooks.toml (+ .vibe\hooks\*.mjs): base hooks, plus those of the -Agents types (database).
# -Force overwrites an existing AGENTS.md / hooks.toml.
param([string]$Target, [switch]$Global, [switch]$Link, [string[]]$Agents, [switch]$Hooks, [switch]$Force)
if ($Global -eq [bool]$Target) { throw "Specify exactly one of -Target <project> or -Global" }
if ($Global -and $Agents) { throw "-Agents needs -Target <project> (AGENTS.md lives at the project root)" }
if ($Global -and $Hooks) { throw "-Hooks needs -Target <project> (hooks.toml is project-level)" }
$src = Split-Path $PSScriptRoot -Parent
if ($Global) {
  $root = if ($env:VIBE_HOME) { $env:VIBE_HOME } else { Join-Path $HOME ".vibe" }
} else { $root = Join-Path $Target ".vibe" }

# Validate -Agents before touching anything.
if ($Agents) {
  $valid = 'api-spec','api-impl','kafka','database'
  $Agents = $Agents | ForEach-Object { $_ -split ',' } | Where-Object { $_ }
  foreach ($t in $Agents) { if ($valid -notcontains $t) { throw "Unknown agents type: $t" } }
  $agentsOut = Join-Path $Target "AGENTS.md"
  if ((Test-Path $agentsOut) -and -not $Force) { throw "$agentsOut exists; use -Force to overwrite" }
}

$hooksOut = Join-Path $root "hooks.toml"
if ($Hooks -and (Test-Path $hooksOut) -and -not $Force) { throw "$hooksOut exists; use -Force to overwrite" }

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

if ($Agents) {
  $tpl = Join-Path $src "templates"
  $parts = @(Join-Path $tpl "AGENTS.base.md")
  $java = 'api-spec','api-impl','kafka','database'
  if ($Agents | Where-Object { $java -contains $_ }) { $parts += Join-Path $tpl "java-spring\AGENTS.spring-common.md" }
  foreach ($t in $java) { if ($Agents -contains $t) { $parts += Join-Path $tpl "java-spring\AGENTS.$t.md" } }
  $text = ($parts | ForEach-Object { [IO.File]::ReadAllText($_) }) -join ''
  [IO.File]::WriteAllText($agentsOut, $text, (New-Object Text.UTF8Encoding $false))
  Write-Host "Wrote $agentsOut (fill in the TODO markers)"
}

if ($Hooks) {
  $hooksDir = Join-Path $root "hooks"
  New-Item -ItemType Directory -Force $hooksDir | Out-Null
  Copy-Item (Join-Path $src "hooks\scripts\*.mjs") $hooksDir -Force
  $hparts = @(Join-Path $src "hooks\base.toml")
  if ($Agents -contains 'database') { $hparts += Join-Path $src "hooks\database.toml" }
  $htext = ($hparts | ForEach-Object { [IO.File]::ReadAllText($_) }) -join "`n"
  [IO.File]::WriteAllText($hooksOut, $htext, (New-Object Text.UTF8Encoding $false))
  Write-Host "Wrote $hooksOut (needs Node.js; project hooks only load in a trusted folder)"
}
