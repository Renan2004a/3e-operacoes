@echo off
chcp 65001 >nul
title 3E Operacoes
cd /d "%~dp0"
echo ============================================
echo  3E Operacoes - iniciando o servidor...
echo ============================================
echo.
"runtime\node.exe" "app\run.mjs"
echo.
echo O servidor foi encerrado.
pause
