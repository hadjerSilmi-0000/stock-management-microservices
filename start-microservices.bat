@echo off
:: =================================================================
:: Start All Microservices
:: Make sure infrastructure is running first!
:: =================================================================

color 0B
echo.
echo ========================================
echo   STARTING MICROSERVICES
echo ========================================
echo.

:: Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."

:: Check if infrastructure is running
echo Checking infrastructure services...
curl -s http://localhost:8500/v1/agent/self >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: Consul is not running!
    echo Please run start-infrastructure.bat first
    echo.
    pause
    exit /b 1
)

curl -s http://localhost:15672 >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo WARNING: RabbitMQ is not responding
    echo Services may not communicate properly
    echo.
    timeout /t 3 /nobreak >nul
)

curl -s http://localhost:8080/ping >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo WARNING: Traefik is not running
    echo API Gateway will not route traffic
    echo.
    timeout /t 3 /nobreak >nul
)

echo Infrastructure check complete.
echo.

:: Start each microservice in a new window
echo [1/4] Starting Users Service (Port 5001)...
start "Users Service" cmd /k "cd services\users && npm start"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Products Service (Port 5002)...
start "Products Service" cmd /k "cd services\products && npm start"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Stock Service (Port 5003)...
start "Stock Service" cmd /k "cd services\stock && npm start"
timeout /t 3 /nobreak >nul

echo [4/4] Starting Suppliers Service (Port 5004)...
start "Suppliers Service" cmd /k "cd services\suppliers && npm start"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ALL MICROSERVICES STARTING
echo ========================================
echo.
echo Services will be available at:
echo   - Users:     http://localhost:5001/api/users
echo   - Products:  http://localhost:5002/api/products
echo   - Stock:     http://localhost:5003/api/stock
echo   - Suppliers: http://localhost:5004/api/suppliers
echo.
echo Through API Gateway (Traefik):
echo   - Users:     http://localhost/api/users
echo   - Products:  http://localhost/api/products
echo   - Stock:     http://localhost/api/stock
echo   - Suppliers: http://localhost/api/suppliers
echo.
echo Check individual windows for startup logs.
echo.
echo Waiting 15 seconds for services to start...
timeout /t 15 /nobreak >nul

echo.
echo Verifying service health...
echo.

:: Test each service
curl -s http://localhost:5001/api/users/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Users Service is healthy
) else (
    echo [FAIL] Users Service is not responding
)

curl -s http://localhost:5002/api/products/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Products Service is healthy
) else (
    echo [FAIL] Products Service is not responding
)

curl -s http://localhost:5003/api/stock/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Stock Service is healthy
) else (
    echo [FAIL] Stock Service is not responding
)

curl -s http://localhost:5004/api/suppliers/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Suppliers Service is healthy
) else (
    echo [FAIL] Suppliers Service is not responding
)

echo.
echo Testing through API Gateway...
echo.

curl -s http://localhost/api/users/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Users Service accessible via Traefik
) else (
    echo [FAIL] Users Service not accessible via Traefik
)

curl -s http://localhost/api/products/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Products Service accessible via Traefik
) else (
    echo [FAIL] Products Service not accessible via Traefik
)

echo.
echo ========================================
echo.
echo Monitoring URLs:
echo   - Consul UI:   http://localhost:8500/ui
echo   - RabbitMQ UI: http://localhost:15672 (guest/guest)
echo   - Traefik UI:  http://localhost:8080/dashboard/
echo.
echo To stop all services: stop-all.bat
echo.
pause