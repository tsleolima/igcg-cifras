@echo off
setlocal

REM Caminho base do repositório (pasta onde este script está)
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

if not exist "%BACKEND_DIR%" (
  echo [ERRO] Pasta backend nao encontrada em "%BACKEND_DIR%"
  exit /b 1
)

if not exist "%FRONTEND_DIR%" (
  echo [ERRO] Pasta frontend nao encontrada em "%FRONTEND_DIR%"
  exit /b 1
)

REM Decide comando do backend com base no ambiente virtual disponivel.
set "BACKEND_CMD=uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

if exist "%ROOT%backend\.venv\Scripts\activate.bat" (
  set "BACKEND_CMD=call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
) else if exist "%ROOT%backend\venv\Scripts\activate.bat" (
  set "BACKEND_CMD=call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

echo Iniciando backend e frontend...

start "IGCG Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && %BACKEND_CMD%"
start "IGCG Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo Pronto. Backend e frontend foram iniciados em janelas separadas.