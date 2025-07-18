@echo off
echo Generando certificados SSL autofirmados...
echo.

REM Verificar si OpenSSL está instalado
where openssl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: OpenSSL no está instalado o no está en el PATH.
    echo Por favor, instale OpenSSL y agregue al PATH del sistema.
    echo.
    echo Puede descargarlo de: https://slproweb.com/products/Win32OpenSSL.html
    pause
    exit /b 1
)

cd /d "%~dp0"

echo Generando clave privada...
openssl genrsa -out private.key 2048

echo.
echo Generando solicitud de certificado...
openssl req -new -key private.key -out request.csr -subj "/C=ES/ST=Barcelona/L=Sabadell/O=Sistema Pilonas/CN=213.96.33.84"

echo.
echo Generando certificado autofirmado (válido por 365 días)...
openssl x509 -req -days 365 -in request.csr -signkey private.key -out certificate.crt

echo.
echo Limpiando archivos temporales...
del request.csr

echo.
echo ¡Certificados generados exitosamente!
echo - private.key: Clave privada
echo - certificate.crt: Certificado público
echo.
echo NOTA: Estos son certificados autofirmados para desarrollo.
echo Los navegadores mostrarán una advertencia de seguridad.
pause
