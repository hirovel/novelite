param([ValidateSet('cancel', 'success', 'checksum', 'network')][string]$Scenario = 'cancel')
$ErrorActionPreference = 'Stop'
Import-Module Microsoft.PowerShell.Utility
Import-Module Microsoft.PowerShell.Management
$global:NoveliteInstallerTest = @{ Started = $false; Scenario = $Scenario }
function Invoke-RestMethod {
    if ($global:NoveliteInstallerTest.Scenario -eq 'network') { throw 'Offline test' }
    [pscustomobject]@{ assets = @(
        [pscustomobject]@{ name = 'novelite_1.0.2_x64-setup.exe'; browser_download_url = 'https://example.invalid/setup.exe' },
        [pscustomobject]@{ name = 'SHA256SUMS.txt'; browser_download_url = 'https://example.invalid/SHA256SUMS.txt' }
    ) }
}
function Invoke-WebRequest {
    param($Uri, $OutFile)
    if ($Uri -like '*SHA256SUMS.txt') {
        $hash = if ($global:NoveliteInstallerTest.Scenario -eq 'checksum') { 'b' * 64 } else { 'a' * 64 }
        Set-Content -LiteralPath $OutFile -Value "$hash  novelite_1.0.2_x64-setup.exe"
    } else { Set-Content -LiteralPath $OutFile -Value 'Mock installer' }
}
function Get-FileHash { [pscustomobject]@{ Hash = 'a' * 64 } }
function Start-Process {
    $global:NoveliteInstallerTest.Started = $true
    [pscustomobject]@{ ExitCode = $(if ($global:NoveliteInstallerTest.Scenario -eq 'cancel') { 1602 } else { 0 }) }
}
$failed = $false
try { & "$PSScriptRoot/../install.ps1" } catch { $failed = $true; Write-Output "Caught expected failure: $_" }
if ($Scenario -eq 'success' -and ($failed -or -not $global:NoveliteInstallerTest.Started)) { throw 'Valid installer did not succeed' }
if ($Scenario -ne 'success' -and -not $failed) { throw "$Scenario was incorrectly reported as successful" }
if ($Scenario -eq 'cancel' -and -not $global:NoveliteInstallerTest.Started) { throw 'Cancellation scenario never reached the installer' }
if ($Scenario -in @('checksum', 'network') -and $global:NoveliteInstallerTest.Started) { throw 'Installer started after download/verification failure' }
Write-Output "PASS Windows installer: $Scenario"
