# Sobe o conector local e o túnel rápido para a demonstração.
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File scripts/conector-demo.ps1
#
# O túnel rápido não tem SLA e a URL muda a cada execução. Ao final, o script
# imprime o comando para atualizar o Railway e reiniciar o serviço.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$node = 'C:\Program Files\nodejs'
if (Test-Path $node) { $env:Path = "$node;" + $env:Path }

Write-Host 'Subindo o conector local (porta 8787)...' -ForegroundColor Cyan
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm --workspace connector-local run start' -WorkingDirectory $raiz
Start-Sleep -Seconds 6

try {
  $saude = Invoke-WebRequest -Uri 'http://localhost:8787/health' -UseBasicParsing -TimeoutSec 20
  Write-Host "Conector: $($saude.StatusCode) $($saude.Content)" -ForegroundColor Green
} catch {
  Write-Warning 'O conector não respondeu. Verifique connector-local/.env (Top Gerente) e tente novamente.'
  exit 1
}

$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
if (-not (Test-Path $cloudflared)) { $cloudflared = 'C:\Program Files\cloudflared\cloudflared.exe' }
if (-not (Test-Path $cloudflared)) {
  Write-Warning 'cloudflared não encontrado. Instale com: winget install Cloudflare.cloudflared'
  exit 1
}

Write-Host 'Abrindo o túnel rápido do Cloudflare...' -ForegroundColor Cyan
$log = Join-Path $env:TEMP 'cloudflared-demo.log'
if (Test-Path $log) { Remove-Item $log -Force }
Start-Process -FilePath $cloudflared -ArgumentList 'tunnel', '--url', 'http://localhost:8787', '--no-autoupdate' -RedirectStandardError $log

$url = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $log) {
    $texto = Get-Content $log -Raw
    $m = [regex]::Match($texto, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($m.Success) { $url = $m.Value; break }
  }
}
if (-not $url) { Write-Warning 'Não foi possível descobrir a URL do túnel. Veja o log em ' + $log; exit 1 }

Write-Host "Túnel: $url" -ForegroundColor Green
Write-Host ''
Write-Host 'Atualize o Railway e reinicie o serviço:' -ForegroundColor Yellow
Write-Host "  railway variables --set `"LOCAL_CONNECTOR_BASE_URL=$url`" --skip-deploys -s 3e-operacoes"
Write-Host '  railway redeploy -y -s 3e-operacoes'
Write-Host ''
Write-Host 'Teste a importação de um pedido novo antes da apresentação.' -ForegroundColor Yellow
