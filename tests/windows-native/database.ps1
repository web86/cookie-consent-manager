$ErrorActionPreference = 'Stop'
# Use a fresh data directory and process, never an installed service/database.
$server = Get-ChildItem 'C:\Program Files\MySQL\*\bin\mysqld.exe','C:\tools\mysql*\bin\mysqld.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if (!$server) { throw 'Native MySQL server executable unavailable in Windows runner' }
$data = Join-Path $env:RUNNER_TEMP 'cc-native-mysql-data'
if (Test-Path $data) { throw 'Refusing to reuse database directory' }
New-Item -ItemType Directory $data | Out-Null
& $server.FullName --initialize-insecure "--datadir=$data" --console
if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed' }
$process = Start-Process $server.FullName -ArgumentList @("--datadir=`"$data`"",'--port=3307','--bind-address=127.0.0.1','--mysqlx=0','--console') -PassThru -RedirectStandardOutput "$env:RUNNER_TEMP/cc-mysql.stdout.log" -RedirectStandardError "$env:RUNNER_TEMP/cc-mysql.stderr.log"
$process.Id | Out-File "$env:RUNNER_TEMP/cc-mysql.pid"
for ($i=0;$i -lt 40;$i++) {
    try { $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1',3307); $client.Close(); Write-Host 'Native MySQL ready on loopback:3307'; return } catch { Start-Sleep -Seconds 1 }
}
throw 'MySQL did not become ready'
