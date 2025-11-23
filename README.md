# TFG - GESTION DE TIENDAS VIRTUALES

## Clonar el repositorio de Github
```sh
git clone https://github.com/aliciagb14/TFG2_FINAL_Version.git
cd TFG2_FINAL_Version
```

## Prerequisitos
Ver si tenemos descargadas las siguientes dependencias:
- [Docker desktop](https://www.docker.com/products/docker-desktop/)
- [Node](https://nodejs.org/es): v22.12.0
- Prestashop versión: 1.7.8.11
- XAMPP versión: 7.4.33 portable
Añadiremos las dependencias al path: 
```sh
$env:Path += ";C:\Windows\System32;C:\Windows;C:\Program Files\nodejs;C:\Program Files\Docker\Docker\resources\bin"
```
Comprobar si esta instalado: `npm -v` y `node -v`


## Levantar contenedores minIO y Keycloak
Este proyecto proporciona un entorno completo con:
1. Keycloak 26.2.0 → gestión de usuarios (alumnos/profesores)
2. MinIO → almacenamiento de backups (un bucket por alumno)

Para construir y arrancar los contenedores por primera vez:
```sh
docker compose up -d --build
```
Esto cargará automáticamente:
- Un realm exportado por defecto (realm-export.json)
- Un tema personalizado de Keycloak (/frontend/keycloak-themes)
- Un servidor MinIO accesible localmente

## Levantar backend
Entra en el repositorio clonado y ve al directorio backend con:
```sh
cd backend
```
Ejecuta el script que arranca los servicios con:
```sh
./run-services.ps1
```
Este backend expone las APIs necesarias para que el frontend pueda autenticar usuarios, gestionar alumnos y procesar acciones con MinIO.

## Levantar frontend
```sh
cd frontend
```
Instala las dependencias:
```sh
npm i
```
Arranca el servidor de desarrollo:
```sh
npm run dev
```
Ya podemos acceder a la plataforma localhost: http://localhost:5173

## Detener los servicios
```sh
docker compose down 
```