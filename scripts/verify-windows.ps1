$ErrorActionPreference = 'Stop'
$bundle = Join-Path $PSScriptRoot "../src-tauri/target/$env:TARGET/release/bundle"
$expectedHash = (Get-FileHash -LiteralPath "$bundle/../novelite.exe" -Algorithm SHA256).Hash
function Test-App([string]$Executable) {
    if (-not (Test-Path -LiteralPath $Executable)) { throw "Installed executable missing: $Executable" }
    if ((Get-FileHash -LiteralPath $Executable -Algorithm SHA256).Hash -ne $expectedHash) { throw 'Installed binary does not match this build' }
    $app = Start-Process -FilePath $Executable -PassThru -WindowStyle Hidden
    try {
        Start-Sleep -Seconds 8
        if ($app.HasExited) { throw "Installed app exited during startup: $($app.ExitCode)" }
    } finally { if (-not $app.HasExited) { Stop-Process -Id $app.Id } }
}
$exe = @(Get-ChildItem -LiteralPath "$bundle/nsis" -Filter '*-setup.exe')
if ($exe.Count -ne 1) { throw 'Expected one NSIS installer' }
$installDir = Join-Path $env:RUNNER_TEMP 'novelite-nsis-test'
$setup = Start-Process -FilePath $exe[0].FullName -ArgumentList "/S /D=$installDir" -Wait -PassThru -WindowStyle Hidden
if ($setup.ExitCode -ne 0) { throw "NSIS installation failed: $($setup.ExitCode)" }
Test-App (Join-Path $installDir 'novelite.exe')
$registration = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\novelite'
$registration | Select-Object DisplayName, Publisher, DisplayVersion | ConvertTo-Json -Compress | Write-Output
$uninstaller = Join-Path $installDir 'uninstall.exe'
$remove = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
if ($remove.ExitCode -ne 0) { throw 'NSIS uninstall failed' }

$msi = @(Get-ChildItem -LiteralPath "$bundle/msi" -Filter '*.msi')
if ($msi.Count -ne 1) { throw 'Expected one MSI installer' }
$msiDir = Join-Path $env:RUNNER_TEMP 'novelite-msi-test'
$msiEngine = New-Object -ComObject WindowsInstaller.Installer
$database = $msiEngine.OpenDatabase($msi[0].FullName, 0)
$view = $database.OpenView('SELECT `Value` FROM `Property` WHERE `Property` = ''ProductCode''')
$view.Execute()
$productCode = $view.Fetch().StringData(1)
$view.Close()
$setup = Start-Process msiexec.exe -ArgumentList "/i `"$($msi[0].FullName)`" /qn /norestart INSTALLDIR=`"$msiDir`" /L*v `"$env:RUNNER_TEMP/novelite-msi.log`"" -Wait -PassThru -WindowStyle Hidden
if ($setup.ExitCode -notin @(0, 3010)) {
    Get-Content "$env:RUNNER_TEMP/novelite-msi.log" -Tail 100
    throw "MSI installation failed: $($setup.ExitCode)"
}
try {
    # MSI may recover an earlier NSIS install location through AppSearch.
    # Verify the actual registered location and exact binary, rather than assuming a path.
    $registration = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$productCode"
    $registration | Select-Object DisplayName, DisplayVersion, InstallLocation | ConvertTo-Json -Compress | Write-Output
    Test-App (Join-Path $registration.InstallLocation 'novelite.exe')
} catch {
    Get-Content "$env:RUNNER_TEMP/novelite-msi.log" -Tail 120
    throw
} finally {
    $remove = Start-Process msiexec.exe -ArgumentList "/x `"$($msi[0].FullName)`" /qn /norestart" -Wait -PassThru -WindowStyle Hidden
    if ($remove.ExitCode -notin @(0, 3010)) { throw 'MSI uninstall failed' }
}
Write-Output 'NSIS and MSI installation, native startup and uninstall passed'
