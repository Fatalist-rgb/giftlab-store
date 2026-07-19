# Local dev PostgreSQL control (portable binaries - no Docker, no install).
# Production uses Railway's managed Postgres; this is only for local development.
#
#   pnpm db:local:start | db:local:stop | db:local:status
#
# Override the binaries/data location with the PGLOCAL_HOME env var
# (default: F:\Freelance\pglocal, where the portable PostgreSQL 16 was unpacked).

param([ValidateSet('start', 'stop', 'status')] [string]$Action = 'status')

$pgHome = if ($env:PGLOCAL_HOME) { $env:PGLOCAL_HOME } else { 'F:\Freelance\pglocal' }
$bin = Join-Path $pgHome 'pgsql\bin'
$data = Join-Path $pgHome 'data'
$log = Join-Path $pgHome 'log.txt'
$port = 5432

if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) {
  Write-Error "PostgreSQL binaries not found under $pgHome. Set PGLOCAL_HOME or unpack the portable build there."
  exit 1
}

switch ($Action) {
  'start' {
    # start detached - pg_ctl's own -w wait hangs on Windows in non-interactive shells
    Start-Process -FilePath (Join-Path $bin 'pg_ctl.exe') -ArgumentList '-D', $data, '-l', $log, 'start' -WindowStyle Hidden
    for ($i = 0; $i -lt 40; $i++) {
      & (Join-Path $bin 'pg_isready.exe') -h 127.0.0.1 -p $port -q
      if ($LASTEXITCODE -eq 0) { Write-Output "postgres ready on 127.0.0.1:$port"; exit 0 }
      Start-Sleep -Milliseconds 500
    }
    Write-Error "postgres did not become ready - see $log"
    exit 1
  }
  'stop' {
    & (Join-Path $bin 'pg_ctl.exe') -D $data stop -m fast
  }
  'status' {
    & (Join-Path $bin 'pg_isready.exe') -h 127.0.0.1 -p $port
  }
}
