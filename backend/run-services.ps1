docker start ce-keycloak

$backendPath = Get-ChildItem -Path "C:\Users\alici\Documents\Uni\TFG2" -Recurse -Directory -Force -ErrorAction SilentlyContinue |
               Where-Object { $_.FullName -like "*\backend\services" } |
               Select-Object -First 1 -ExpandProperty FullName
         
if (-not $backendPath) {
    Write-Error "Directorio backend no encontrado"
    exit 1
}
Set-Location $backendPath
Write-Output "DIR BACKEND: $backendPath"
# Server Keycloak recibe llamadas desde el frontend y se usa como puente hacia API keycloak
Start-Process powershell -ArgumentList 'node .\serverKeycloak.js'

# Server Minio recibe llamadas desde el frontend y se usa como ppuente hacia API Minio
Start-Process powershell -ArgumentList 'node .\serverMinio.js'

Write-Output "Servicios lanzados en ventanas separadas ccorrectamente."

Write-Output "Estado de contenedores activos:"
docker ps