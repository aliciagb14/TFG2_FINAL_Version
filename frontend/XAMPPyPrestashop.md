# DESCARGA Y CONFIGURACION XAMPP Y PRESTASHOP
Incompatibilidad de windows11 con mysql en xampp?
Se quieren estas versiones fijas
Prestashop versión: 1.7.8.11
XAMPP versión: 7.4.33 portable
1. Version portable de xampp obliga a descomprimir en C:\xampp (ya que todas las referenciasde/a Apache y MySQL en este tipo de instalación, en los ficheros de configuración, van dirigidasa este “path” en el disco duro)
2. Creamos un acceso directo del “Panel de Control” de
XAMPP en el escritorio, C:\xampp\xampp-control.exe, lo ejecutamos (como admin) y arrancando los servicios de Apache y MySQL comprobamos que no existen conflictos de puertos con otros servicios que tengamos activados en Windows.
3. Desactivar los servicios que ocasionen posibles colisiones, o modificar los puertos http/https/MySQL (modificar estos puertos, por defecto, nos traerá trastornos cuando estemos probando las tiendas virtuales que creemos,
porque tendremos que añadir siempre los puertos en las direcciones que escribamos en el navegador).
httpd.conf tiene: Listen 80
my.ini: port = 3306
httpd-ssl.conf: <VirtualHost_default_:443>
Apache se levanta en 80, 443 y MySQL en 3306
4. Descomprimimos en C:\xampp\htdocs\ la página web “project” (bajar de Moodle), y configuramos en XAMPP que nos cargue directamente “project” al hacer clic en“Apache/Admin” en el Panel de Control de XAMPP.
----------------------------------------------------------------------
 El contenido inicial que tenemos es:
 <?php
	if (!empty($_SERVER['HTTPS']) && ('on' == $_SERVER['HTTPS'])) {
		$uri = 'https://';
	} else {
		$uri = 'http://';
	}
	$uri .= $_SERVER['HTTP_HOST'];
	header('Location: '.$uri.'/dashboard/');
	exit;
?>
Something is wrong with the XAMPP installation :-(

-----------------------------------------------------------------------
Si vamos al link: localhost/dashboard podemos ver si tenemos todo bbien, si ponemos localhost/phpmyadmin podemos ver el contenido que tenemos en nuestra BD

 Para ello editamos, en esta mismacarpeta, “index.php” y ponemos el nombre de nuestra web “project".
C:\xampp\htdocs\index.php debe tener esto de contenido en su index.php:
------------------------------------------------------------------------
<?php
    if (!empty($_SERVER['HTTPS']) && ('on' == $_SERVER['HTTPS'])) {
        $uri 'https://';
    } else {
        $uri= 'http://';
    }
    $uri .= $_SERVER['HTTP_HOST'];

    header('Location: '.$uri.'/project');
    exit;
?>

Something is wrong with the XAMPP installation :-(
------------------------------------------------------------------------
¿Donde debemos subir nuestras tiendas virtuales Prestashop?:
Vamos a C:\xampp\htdocs

Desde xampp control panel:
SI le damos al boton admin que nos aparece en apache nos redirecciona a donde montaremos nuestra pag web (en este caso va a /dashboard) xk es lo qu etenemos en index.php (la tenemos en 80, 443)
SI le damos al boton admin que nos aparece mysql nos aparecera la bd mysql  (mysql la tenemos en puerto 3306)
La tienda de prestashop se indica donde que puertos se hacen


# XCA
Instalar XCA, y darle a crear BD, en este caso: ComercioElectronico y password: alitfg25.5319
Le damos  anuevo certificado y en la parte de abajo seleccionamos CA, le damos a aplicar todo y lo haremos en SHA512
Darle a Sujeto y rellenar los datos, le damos a Generar una nueva clave (RSA y 2048 bits)
Extensiones : autoridad certificadora, check de critical y los dos de key identifier y SUbject Alternative name => DNS:upm.es
```
X509v3 Basic Constraints critical:
CA:TRUE
X509v3 Subject Key Identifier:
92:BE:E3:05:FC:97:4F:76:49:13:07:AB:C9:6D:A2:B7:53:F2:61:60
X509v3 Authority Key Identifier:
0.
X509v3 Key Usage:
Certificate Sign, CRL Sign
X509v3 Subject Alternative Name:
DNS:comercio.electronico.es
Netscape Cert Type:
SSL CA, S/MIME CA, Object Signing CA
Netscape Comment:
xca certificate
```
y ahoora generamos uno nuevo el de localhost:
```
X509v3 Basic Constraints critical:
CA:FALSE
X509v3 Subject Key Identifier:
F0:98:F9:DC:0E:D2:F1:6D:85:84:5D:18:FF:3D:F0:00:B5:AB:87:AF
X509v3 Authority Key Identifier:
92:BE:E3:05:FC:97:4F:76:49:13:07:AB:C9:6D:A2:B7:53:F2:61:60
X509v3 Key Usage:
Digital Signature, Non Repudiation, Key Encipherment, Key Agreement
X509v3 Extended Key Usage:
TLS Web Server Authentication
X509v3 Subject Alternative Name:
DNS:localhost
Netscape Cert Type:
SSL Server
Netscape Comment:
xca certificate
```
<image src="certificadoxca.png" alt="XCA">
Ir a: xamp-> apache-> config
Volver a xca e ir al apartado de certificados, donde tenemos:
- Comercio Electronico: Autoridad de certificacion
- Localhost: se ha emitido para que lo instale en el servidor apache: 
Exportamos en: C:\xampp\apache\conf\ssl.crt\Comercio_Electronico_(CA).crt
Y ahora en el apartado dentro de XCA de claves privadas, exporto la de localhost en: C:\xampp\apache\conf\ssl.key

Y ahora deberemos de configurar para decirle a apache que pag web estan securizadas
Ir a httpd-ssl.conf y poner: SSLCertificateFile "conf/ssl.crt/localhost.crt"
SSLCertificateKeyFile "conf/ssl.key/localhost.pem"
y en el apartado de: Certificate authority , descomentar lo siguiente y poner mi certificado:
```
SSLCACertificatePath "${SRVROOT}/conf/ssl.crt"
SSLCACertificateFile "${SRVROOT}/conf/ssl.crt/Comercio_Electronico_(CA).crt"
```

Una vez hecho esto, hacemos: **cer** en el buscador para que me abra el **Administrador certificados de usuario del panel de control** y vamos a:
Entidades de certificacion raiz de confianza => Certificados => Todas las tareas => Importar => C:\xampp\apache\conf\ssl.crt\Comercio_Electronico_(CA).crt

Copiamos la carpeta \project en htdocs y cambiamos el index.php donde pone /dashboard por /project.
Copiamos la carpeta de prestashop en htdocs y la renombramos con el nmbre de nuestra tienda, eliminamos: **Install_prestashop.html** Escribir despues: https://localhost/tiendaCE/    (siendo tiendaCE el nombre de nuestra tienda)

Al seguir con la instalacion me sale:
1) Install and enable the intl extension (used for validators).
2) Install and/or enable a PHP accelerator (highly recommended).
3) Setting "realpath_cache_size" to e.g. "5242880" or "5M" in php.ini* may improve performance on Windows significantly in some cases.

Todos se solucionan en php.ini, descomentaremos la extension intl y cambiaremos realpath_cache_size a 5M

Paramos el servicio y lo volvemos a lanzar
Rellenamos datos : 
Nombre de la tienda debe corresponder al que pusimos anteriormente aqui: https://localhost/tiendaCE/  en este caso; tiendaCE
Hay que darle a instalando datos de demostracion: Si
SI queremos activar ssl ya que ya tenemos https configurado y asi nos genera el token
<image src="prestashop.png" alt="Configuracion prestashop">
Password: 12345678
y Todos los datos en rojo iguales siempre.

A continuacion aparece el nombre de la BD que sera nombretienda_db
<image src="bdconfig.png" alt="Configuracion bd"> Siempre sigue esta estructura, prefijo: nombretienda_
Le damos a: Comprobar conexion con BD y crear BD

Una vez acabo la isntalacion nos metemos en htdocs\nombreTienda y borramos carpeta   **install**
Direccion de correo: ce@etsisi.upm.es	 y password: 12345678
Y si nos metemos en: localhost/nombreTienda/admin me deja introducir este mail y password



!IMPORTANT
> Añadi: Header always set X-Frame-Options "SAMEORIGIN" en httpd.conf de apache

Si me falla apache hacer:
```sh
cd C:\xampp\apache\bin
httpd.exe
```

ahora mismo la tienda que tengo subida en mi boton de ver tienda de prestashop (es la que he creado al instalarme todo lo necesario de prestashop + apache y lo tengi en; C:\xampp\htdocs\tiendaCE ) los alumnos deberan de subir un .zip de su carpeta de tienda (como la mia que llame teindaCE), pero debera llamarse ce_(3letras) que seran nombre y apellidos, si me llamo Sergio Gomez Lopez (mi tienda alojada en htdocs se llamará):  ce_sgl. Igualmente el alumno en cuestion (en el caso de Sergio) subira su .zip llamado ce_sgl.zip, este archivo sera el que deberemos de descomprimir y cargar en: C:\xampp\htdocs\ . Tambien debe de subirme su .sql que se llamara ce_sgl_db.sql en el caso de sergio. Si ahora Lorena Serrano Moreno sube su tienda virtual con minio (subiendo su .zip y su .sql), los ficheros se llamaran ce_lsm.zip (que habra que descomprimir en C:\xampp\htdocs) y ce_lsm_db.sql que sera su fichero mysql de la tienda virtual. Cuando el user con el rol de profesor le de al icono de visualizar, debera de poder ver la previsualizacion de la tienda virtual de prestashop.