# Install the Windows desktop app; no Node.js is required.
# irm https://raw.githubusercontent.com/hirovel/novelite/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
if (-not [Environment]::Is64BitOperatingSystem) { throw 'Novelite requires 64-bit Windows.' }
$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/hirovel/novelite/releases/latest' -Headers @{ 'User-Agent' = 'Novelite-Installer' } -TimeoutSec 30
$installer = @($release.assets | Where-Object { $_.name -match '^novelite_[0-9.]+_x64-setup\.exe$' })
$checksums = @($release.assets | Where-Object { $_.name -eq 'SHA256SUMS.txt' })
if ($installer.Count -ne 1 -or $checksums.Count -ne 1) { throw 'No verified Windows installer found. Visit https://github.com/hirovel/novelite/releases/latest' }
$downloadDir = Join-Path ([IO.Path]::GetTempPath()) ('novelite-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $downloadDir | Out-Null
$installerPath = Join-Path $downloadDir $installer[0].name
$checksumPath = Join-Path $downloadDir 'SHA256SUMS.txt'
try {
    Write-Host "Downloading $($installer[0].name)..."
    Invoke-WebRequest -Uri $installer[0].browser_download_url -OutFile $installerPath -UseBasicParsing
    Invoke-WebRequest -Uri $checksums[0].browser_download_url -OutFile $checksumPath -UseBasicParsing
    $pattern = '^([a-fA-F0-9]{64})\s+\*?' + [regex]::Escape($installer[0].name) + '$'
    $entries = @(Get-Content -LiteralPath $checksumPath | Where-Object { $_ -match $pattern })
    if ($entries.Count -ne 1) { throw 'Missing or ambiguous installer checksum.' }
    $expected = [regex]::Match($entries[0], $pattern).Groups[1].Value
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $installerPath).Hash -ne $expected) { throw 'Installer checksum mismatch. Installation stopped.' }
    $process = Start-Process -FilePath $installerPath -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -notin @(0, 3010)) { throw "Installation did not complete (exit code $($process.ExitCode))." }
    Write-Host 'Novelite desktop app installed. Open it from the Start menu.'
    if ($process.ExitCode -eq 3010) { Write-Host 'Windows requires a restart to finish installation.' }
} finally {
    Remove-Item -LiteralPath $installerPath, $checksumPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $downloadDir -ErrorAction SilentlyContinue
}
