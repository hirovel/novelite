param(
    [Parameter(Mandatory=$true)][ValidateSet('install', 'verify', 'uninstall', 'launch')][string]$Action,
    [Parameter(Mandatory=$true)][ValidateSet('nsis', 'msi')][string]$Kind,
    [Parameter(Mandatory=$true)][string]$Root,
    [Parameter(Mandatory=$true)][string]$Version
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Disposable CI runner required' }
$installDir = Join-Path $Root 'installed app'
$fixture = Join-Path $Root $Version
function Run-Installer([string]$Program, [string]$Arguments) {
    $process = Start-Process -FilePath $Program -ArgumentList $Arguments -PassThru -WindowStyle Hidden
    if (-not $process.WaitForExit(180000)) { throw "Installer timeout: $Program" }
    if ($process.ExitCode -notin @(0, 3010)) { throw "Installer failed: $($process.ExitCode)" }
}
function Get-Registration {
    if ($Kind -eq 'nsis') {
        return Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\novelite'
    }
    $registrations = @(Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' |
        Where-Object { $_.DisplayName -eq 'novelite' })
    if ($registrations.Count -ne 1) { throw "Expected one Novelite MSI registration, found $($registrations.Count)" }
    return $registrations[0]
}
if ($Action -eq 'install') {
    if ($Kind -eq 'nsis') {
        $package = @(Get-ChildItem -LiteralPath $fixture -Filter '*-setup.exe')
        if ($package.Count -ne 1) { throw 'Expected one NSIS installer' }
        Run-Installer $package[0].FullName "/S /D=$installDir"
    } else {
        $package = @(Get-ChildItem -LiteralPath $fixture -Filter '*.msi')
        if ($package.Count -ne 1) { throw 'Expected one MSI installer' }
        Run-Installer 'msiexec.exe' "/i `"$($package[0].FullName)`" /qn /norestart INSTALLDIR=`"$installDir`" /L*v `"$Root/install-$Version-msi.log`""
    }
} elseif ($Action -eq 'uninstall') {
    if ($Kind -eq 'nsis') {
        Run-Installer (Join-Path $installDir 'uninstall.exe') '/S'
    } else {
        $registration = Get-Registration
        Run-Installer 'msiexec.exe' "/x $($registration.PSChildName) /qn /norestart /L*v `"$Root/uninstall-msi.log`""
    }
} elseif ($Action -eq 'launch') {
    Start-Process -FilePath (Join-Path $installDir 'novelite.exe') -WindowStyle Hidden | Out-Null
} elseif ($Action -eq 'verify') {
    $registration = Get-Registration
    if ($registration.DisplayVersion -ne $Version) { throw "Registered version is $($registration.DisplayVersion), expected $Version" }
    $extract = Join-Path $Root "payload-$Version-$Kind"
    if ($Kind -eq 'nsis') {
        $package = @(Get-ChildItem -LiteralPath $fixture -Filter '*-setup.exe')[0]
        $payloadName = 'novelite.exe'
    } else {
        $package = @(Get-ChildItem -LiteralPath $fixture -Filter '*.msi')[0]
        $payloadName = 'Path'
    }
    & 'C:\Program Files\7-Zip\7z.exe' e $package.FullName $payloadName "-o$extract" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot extract expected installer payload' }
    $expected = (Get-FileHash -LiteralPath (Join-Path $extract $payloadName) -Algorithm SHA256).Hash
    $actual = (Get-FileHash -LiteralPath (Join-Path $installDir 'novelite.exe') -Algorithm SHA256).Hash
    if ($actual -ne $expected) { throw 'Installed executable is not the exact signed update payload' }
    Write-Output "PASS $Kind $Version registry and exact installed executable SHA-256 $actual"
}
