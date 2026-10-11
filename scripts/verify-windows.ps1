$ErrorActionPreference = 'Stop'
$bundle = Join-Path $PSScriptRoot "../src-tauri/target/$env:TARGET/release/bundle"
function Test-App([string]$Executable) {
    if (-not (Test-Path -LiteralPath $Executable)) { throw "Installed executable missing: $Executable" }
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
$uninstaller = Join-Path $installDir 'uninstall.exe'
$remove = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
if ($remove.ExitCode -ne 0) { throw 'NSIS uninstall failed' }

$msi = @(Get-ChildItem -LiteralPath "$bundle/msi" -Filter '*.msi')
if ($msi.Count -ne 1) { throw 'Expected one MSI installer' }
$msiDir = Join-Path $env:RUNNER_TEMP 'novelite-msi-test'
$setup = Start-Process msiexec.exe -ArgumentList "/i `"$($msi[0].FullName)`" /qn /norestart APPLICATIONFOLDER=`"$msiDir`" /L*v `"$env:RUNNER_TEMP/novelite-msi.log`"" -Wait -PassThru -WindowStyle Hidden
if ($setup.ExitCode -notin @(0, 3010)) {
    Get-Content "$env:RUNNER_TEMP/novelite-msi.log" -Tail 100
    throw "MSI installation failed: $($setup.ExitCode)"
}
try { Test-App (Join-Path $msiDir 'novelite.exe') } finally {
    $remove = Start-Process msiexec.exe -ArgumentList "/x `"$($msi[0].FullName)`" /qn /norestart" -Wait -PassThru -WindowStyle Hidden
    if ($remove.ExitCode -notin @(0, 3010)) { throw 'MSI uninstall failed' }
}
Write-Output 'NSIS and MSI installation, native startup and uninstall passed'
