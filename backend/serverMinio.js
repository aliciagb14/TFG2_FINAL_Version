const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Minio = require('minio');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const { exec } = require('child_process');
const AdmZip = require('adm-zip');
const Unrar = require('node-unrar-js');


const HTDOCS_DIR = "C:\\xampp\\htdocs";

const app = express();
app.use(express.json()); 
app.use(cors({
  origin: 'http://localhost:5173',  // Permite solo tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const upload = multer({ dest: 'uploads/' });

const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: '08ic8VMbfFjRuJitJk7w',
  secretKey: 'gMFQUk6DqQOAeEGawvSmlx8NwdkFwfnXIvvo0Q3f'
});

// Middleware para extraer user y roles del token (simplificado)
const extractUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('No token');

    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    req.user = {
      username: payload.preferred_username,
      roles: payload.realm_access?.roles || []
    };
    next();
  } catch (err) {
    return res.status(401).send('Invalid token');
  }
};

async function importarSQL(sqlPath, dbName) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // tu password de MySQL
    multipleStatements: true
  });

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  await connection.query(`USE \`${dbName}\`;`);
  await connection.query(sqlContent);

  console.log(`✅ Base de datos ${dbName} importada`);
  await connection.end();
}

app.post('/create-bucket', extractUser, async (req, res) => {
  const { bucketName } = req.body;
  const { roles } = req.user;
  const clientBucketName = req.body.bucketName?.toLowerCase();
  if (!roles.includes('admin')) {
    return res.status(403).json({ message: 'Solo los admins pueden crear buckets' });
  }

  if (!bucketName) {
    return res.status(400).json({ message: 'Debe proporcionar un bucketName' });
  }

  try {
    const exists = await minioClient.bucketExists(clientBucketName);
    if (!exists) await minioClient.makeBucket(clientBucketName);
    res.status(201).json({ message: 'Bucket creado exitosamente', clientBucketName });
  } catch (error) {
    console.error('Error creando bucket:', error);
    res.status(500).json({ message: 'Error creando bucket', error: error.message });
  }
});


// app.post('/upload/:bucketName', extractUser, upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

//     const rawBucketName = req.params.bucketName || req.body.bucketName;
//     console.log("bucketName", rawBucketName)
//     // Crear bucket si no existe
//     const exists = await minioClient.bucketExists(rawBucketName);
//     if (!exists) {
//       await minioClient.makeBucket(rawBucketName);
//       console.log(`✅ Bucket ${rawBucketName} creado`);
//     }

//     // Subir fichero
//     const fileStream = fs.createReadStream(req.file.path);
//     const stat = fs.statSync(req.file.path);

//     await minioClient.putObject(rawBucketName, req.file.originalname, fileStream, stat.size);

//     fs.unlinkSync(req.file.path);

//     res.json({ success: true, message: 'Archivo subido', bucket: rawBucketName, file: req.file.originalname });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error en subida', error: error.message });
//   }
// });

// app.post('/upload/:bucketName', extractUser, upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

//     const rawBucketName = req.params.bucketName || req.body.bucketName;

//     // Crear bucket si no existe
//     const exists = await minioClient.bucketExists(rawBucketName);
//     if (!exists) await minioClient.makeBucket(rawBucketName);

//     const filePath = req.file.path;
//     const originalName = req.file.originalname;
//     const tempDir = path.join(__dirname, 'temp', Date.now().toString());
//     fs.mkdirSync(tempDir, { recursive: true });

//     // Subir fichero a MinIO
//     await minioClient.fPutObject(rawBucketName, originalName, filePath);

//     const rarPath = path.join(tempDir, originalName);
//     fs.renameSync(filePath, rarPath);

//     console.log(`📦 Descomprimiendo ${rarPath} ...`);
//     const extract = Extract(rarPath, tempDir, { $bin: "C:\\Program Files\\7-Zip\\7z.exe" });

//     extract.on('end', () => {
//       console.log("✅ Descompresión terminada");

//       return res.json({
//         success: true,
//         tienda: nombreTienda,
//         url: `https://localhost/${nombreTienda}/`
//       });
//     });

//     extract.on('error', (err) => {
//       console.error("Error descomprimiendo:", err);
//       return res.status(500).json({ message: "Error al descomprimir" });
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Error en subida', error: error.message });
//   }
// });

const TMP_DIR = 'C:\\Users\\alici\\Downloads\\tmpUploads';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
function findFileRecursive(dir, regex) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      const found = findFileRecursive(fullPath, regex);
      if (found) return found;
    } else if (regex.test(file.name)) {
      return fullPath;
    }
  }
  return null;
}

app.post('/upload/:bucketName', extractUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rawBucketName = req.params.bucketName || req.body.bucketName;
    console.log("bucketName", rawBucketName);
    const exists = await minioClient.bucketExists(rawBucketName);
    if (!exists) {
      await minioClient.makeBucket(rawBucketName);
      console.log(`✅ Bucket ${rawBucketName} creado`);
    }
    const fileExt = path.extname(req.file.originalname).toLowerCase();
     if (fileExt === '.zip') {
      const filePath = req.file.path;
      const tmpExtractPath = path.join(TMP_DIR, path.basename(filePath, '.zip'));
      fs.mkdirSync(tmpExtractPath, { recursive: true });

      const mainZip = new AdmZip(filePath);
      mainZip.extractAllTo(tmpExtractPath, true);

      const tiendaZipPath = findFileRecursive(tmpExtractPath, /^ce_[a-z]{3}\.zip$/i);
      const sqlPathInitial = findFileRecursive(tmpExtractPath, /^ce_[a-z]{3}_db\.sql(\.zip)?$/i);

      if (tiendaZipPath && sqlPathInitial) {
        const nombreTienda = path.basename(tiendaZipPath, '.zip');
        const targetDir = path.join(HTDOCS_DIR, nombreTienda);
        const sqlTargetPath = path.join(HTDOCS_DIR, path.basename(sqlPathInitial));

        // Copiar SQL ZIP a htdocs
        fs.copyFileSync(sqlPathInitial, sqlTargetPath);
        console.log('SQL ZIP copiado a htdocs:', sqlTargetPath);

        // Extraer ZIP interno de la tienda
        const tiendaZip = new AdmZip(tiendaZipPath);
        tiendaZip.extractAllTo(targetDir, true);

        console.log(`Tienda ${nombreTienda} desplegada en htdocs`);
      }
    }

    // Subir archivo al bucket en MinIO (funciona para cualquier archivo)
    const fileStream = fs.createReadStream(req.file.path);
    const stat = fs.statSync(req.file.path);
    await minioClient.putObject(rawBucketName, req.file.originalname, fileStream, stat.size);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Archivo subido',
      bucket: rawBucketName,
      file: req.file.originalname
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en subida', error: err.message });
  }
});

app.get('/tienda/:nombreArchivo', (req, res) => {
  const { nombreArchivo } = req.params;
  const baseName = path.basename(nombreArchivo, path.extname(nombreArchivo)).toLowerCase();

  const dirs = fs.readdirSync(HTDOCS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name.toLowerCase());

  const tiendaExistente = dirs.find(d => d === baseName);

  if (!tiendaExistente) return res.status(404).json({ message: 'Tienda no encontrada' });
  return res.json({ tienda: tiendaExistente });
});



// app.post('/upload/:bucketName', extractUser, upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

//     const rawBucketName = req.params.bucketName || req.body.bucketName;
//     const filePath = req.file.path;
//     const originalName = req.file.originalname;

//     // nombre base ce_xxx
//     const nombreTienda = path.basename(originalName, path.extname(originalName));
//     const targetDir = path.join(HTDOCS_DIR, nombreTienda);

//     // Subir fichero a MinIO
//     await minioClient.fPutObject(rawBucketName, originalName, filePath);

//     // Si es .zip → descomprimir en htdocs
//     if (originalName.endsWith('.zip')) {
//       const zip = new AdmZip(filePath);
//       zip.extractAllTo(targetDir, true);
//       console.log(`✅ Carpeta ${nombreTienda} descomprimida en ${HTDOCS_DIR}`);
//     }

//     // Si es .sql → crear BD y restaurar
//     if (originalName.endsWith('.sql')) {
//       const dbName = nombreTienda.replace(/\.sql$/, ''); // ce_xxx_db
//       await createDatabase(dbName, 'ComercioElectronico', 'alitfg25.5319');
//       await importSQL(filePath, dbName, 'ComercioElectronico', 'alitfg25.5319');
//       console.log(`✅ SQL importado en BD ${dbName}`);
//     }

//     res.json({
//       success: true,
//       tienda: nombreTienda,
//       url: `http://localhost/${nombreTienda}/`
//     });

//   } catch (error) {
//     console.error("❌ Error en upload:", error);
//     res.status(500).json({ message: 'Error en subida', error: error.message });
//   }
// });



app.get('/alumnos/:bucketName', extractUser, async (req, res) => {
  try {
    const { roles } = req.user;
    const isAdmin = roles.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Solo los admins pueden ver alumnos' });
    }

    const bucketName = req.params.bucketName.toLowerCase();
    console.log("Buscando bucket:", bucketName);

    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      return res.status(404).json({ message: `El bucket ${bucketName} no existe` });
    }

    const objectsStream = minioClient.listObjectsV2(bucketName, '', true);

    let fileFound = null;
    for await (const obj of objectsStream) {
      if (obj.name.endsWith('.xlsx')) {
        fileFound = obj.name;
        break;
      }
    }

    if (!fileFound) {
      return res.status(404).json({ message: 'No se encontró archivo .xlsx en bucket' });
    }

    const tempFilePath = `./temp/${fileFound}`;
    await new Promise((resolve, reject) => {
      minioClient.fGetObject(bucketName, fileFound, tempFilePath, (err) =>
        err ? reject(err) : resolve()
      );
    });

    const workbook = XLSX.readFile(tempFilePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    fs.unlinkSync(tempFilePath);

    res.json({ alumnos: data });
  } catch (error) {
    console.error('Error al leer alumnos:', error);
    res.status(500).json({ message: 'Error al obtener alumnos', error: error.message });
  }
});


//Comprueba si bucket existe o no
app.get('/bucket-exists/:bucketName', async (req, res) => {
  const { bucketName } = req.params;
  try {
    const exists = await minioClient.bucketExists(bucketName);
    return res.json({ exists });
  } catch (error) {
    console.error("Error checking bucket existence:", error);
    return res.status(500).json({ error: "Failed to check bucket" });
  }
});


// Obtener los ficheros del bucket
app.get('/bucket-files/:bucketName', async (req, res) => {
  const { bucketName } = req.params;
  try {
    const files = [];
    const stream = minioClient.listObjectsV2(bucketName, '', true);
    stream.on('data', obj => files.push(obj.name));
    stream.on('end', () => res.json({ files }));
    stream.on('error', err => {
      console.error(err);
      res.status(500).json({ message: "Error listando archivos" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error general" });
  }
});

app.get('/bucket-file/:bucketName/:filename', async (req, res) => {
  const { bucketName, filename } = req.params;
  try {
    await minioClient.getObject(bucketName, filename, (err, stream) => {
      if (err) {
        console.error("Error al obtener archivo:", err);
        return res.status(404).json({ message: "Archivo no encontrado" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error descargando archivo" });
  }
});

// -----------------------------------------------------------------------------
app.post("/deploy/:bucket", extractUser, async (req, res) => {
  const { bucket } = req.params;

  try {
    console.log(`🚀 Iniciando deploy del bucket: ${bucket}`);

    // 1️⃣ Listar archivos en el bucket
    const files = [];
    const stream = minioClient.listObjectsV2(bucket, '', true);
    await new Promise((resolve, reject) => {
      stream.on('data', obj => files.push(obj.name));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (!files.length) return res.status(404).json({ error: "No hay archivos en el bucket" });

    console.log(`📦 Archivos encontrados: ${files.join(', ')}`);

    // Buscar cualquier archivo comprimido (ZIP o RAR)
    const archivoComprimido = files.find(f => 
      f.toLowerCase().endsWith('.zip') || f.toLowerCase().endsWith('.rar')
    );

    if (!archivoComprimido) {
      return res.status(400).json({ 
        error: "No se encontró archivo comprimido (.zip o .rar)",
        archivos_encontrados: files
      });
    }

    const esRAR = archivoComprimido.toLowerCase().endsWith('.rar');
    const esZIP = archivoComprimido.toLowerCase().endsWith('.zip');

    console.log(`📦 Archivo a procesar: ${archivoComprimido} (${esRAR ? 'RAR' : 'ZIP'})`);

    // 2️⃣ Crear directorio temporal
    const tempDir = path.join(__dirname, "temp", Date.now().toString());
    fs.mkdirSync(tempDir, { recursive: true });

    // 3️⃣ Descargar el archivo
    const archivoPath = path.join(tempDir, archivoComprimido);
    await minioClient.fGetObject(bucket, archivoComprimido, archivoPath);

    console.log(`📥 Archivo descargado: ${fs.statSync(archivoPath).size} bytes`);

    // 4️⃣ Descomprimir según tipo
    if (esZIP) {
      console.log("🗜️ Descomprimiendo ZIP...");
      const zip = new AdmZip(archivoPath);
      zip.extractAllTo(tempDir, true);
      console.log("✅ ZIP descomprimido");
    } else if (esRAR) {
      console.log("🗜️ Descomprimiendo RAR...");
      await descomprimirRAR(archivoPath, tempDir);
      console.log("✅ RAR descomprimido");
    }

    // 5️⃣ Buscar carpeta ce_* y archivo SQL recursivamente
    const resultadoBusqueda = buscarArchivosRecursivo(tempDir);
    const carpetaCE = resultadoBusqueda.carpetaCE;
    const archivoSQL = resultadoBusqueda.archivoSQL;
    const archivoZipInterno = resultadoBusqueda.archivoZipInterno;

    if (!carpetaCE && !archivoZipInterno) {
      return res.status(400).json({ 
        error: "No se encontró carpeta ce_* ni archivo ce_*.zip en el contenido",
        estructura: obtenerEstructuraDirectorio(tempDir)
      });
    }

    let carpetaTiendaFinal = carpetaCE;
    let nombreTienda = carpetaCE ? path.basename(carpetaCE) : null;

    // Si encontramos un ZIP interno, descomprimirlo
    if (archivoZipInterno && !carpetaCE) {
      console.log(`🗜️ Descomprimiendo ZIP interno: ${path.basename(archivoZipInterno)}`);
      const zipInterno = new AdmZip(archivoZipInterno);
      const dirZipInterno = path.join(tempDir, 'zip_interno');
      fs.mkdirSync(dirZipInterno, { recursive: true });
      zipInterno.extractAllTo(dirZipInterno, true);
      
      const busquedaInterna = buscarArchivosRecursivo(dirZipInterno);
      carpetaTiendaFinal = busquedaInterna.carpetaCE;
      nombreTienda = carpetaTiendaFinal ? path.basename(carpetaTiendaFinal) : 
                     path.basename(archivoZipInterno, '.zip');
    }

    if (!carpetaTiendaFinal) {
      if (archivoZipInterno) {
        nombreTienda = path.basename(archivoZipInterno, '.zip');
        console.log(`⚠️ No se encontró carpeta, usando nombre del ZIP: ${nombreTienda}`);
      } else {
        return res.status(400).json({ 
          error: "No se encontró carpeta de tienda válida",
          estructura: obtenerEstructuraDirectorio(tempDir)
        });
      }
    }

    // Validar formato del nombre
    if (!nombreTienda || !nombreTienda.match(/^ce_[a-z]{3}$/i)) {
      return res.status(400).json({
        error: `El nombre debe seguir el formato ce_xxx (ej: ce_sgl). Encontrado: ${nombreTienda}`,
        carpeta_encontrada: carpetaTiendaFinal
      });
    }

    nombreTienda = nombreTienda.toLowerCase();
    const destino = path.join(HTDOCS_DIR, nombreTienda);

    console.log(`🏪 Tienda encontrada: ${nombreTienda}`);
    console.log(`🎯 Destino: ${destino}`);

    // 6️⃣ Crear backup si ya existe
    if (fs.existsSync(destino)) {
      const backupPath = `${destino}_backup_${Date.now()}`;
      await fsExtra.move(destino, backupPath);
      console.log(`🔄 Backup creado en: ${backupPath}`);
    }

    // 7️⃣ Copiar carpeta ce_* a htdocs
    if (carpetaTiendaFinal && fs.existsSync(carpetaTiendaFinal)) {
      console.log(`📋 Copiando ${nombreTienda} a htdocs...`);
      await fsExtra.copy(carpetaTiendaFinal, destino, { overwrite: true });
      console.log("✅ Carpeta copiada a htdocs");
    } else {
      console.log(`⚠️ Creando estructura básica para ${nombreTienda}...`);
      fs.mkdirSync(destino, { recursive: true });
    }

    // 8️⃣ Procesar base de datos si existe
    let dbImportada = false;
    if (archivoSQL && fs.existsSync(archivoSQL)) {
      console.log(`🗄️ Procesando base de datos: ${path.basename(archivoSQL)}`);
      const dbName = `${nombreTienda}_db`;
      console.log(`🗄️ Importando base de datos: ${dbName}`);
      
      const mysqlCmd = `mysql -u root -e "DROP DATABASE IF EXISTS ${dbName}; CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" && mysql -u root ${dbName} < "${archivoSQL}"`;

      try {
        await new Promise((resolve, reject) => {
          exec(mysqlCmd, { timeout: 180000 }, (err, stdout, stderr) => {
            if (err) {
              console.error("❌ Error MySQL:", stderr);
              return reject(new Error(`Error importando DB: ${stderr}`));
            }
            console.log("✅ Base de datos importada exitosamente");
            dbImportada = true;
            resolve();
          });
        });
      } catch (dbError) {
        console.warn("⚠️ Error con base de datos (pero tienda desplegada):", dbError.message);
      }
    } else {
      console.log("ℹ️ No se encontró archivo SQL válido");
    }

    // 9️⃣ Actualizar configuración de PrestaShop si existe
    await actualizarConfiguracionPrestashop(destino, nombreTienda, dbImportada ? `${nombreTienda}_db` : null);

    // 🔟 Limpiar temporales
    try {
      await fsExtra.remove(tempDir);
      console.log("🧹 Archivos temporales limpiados");
    } catch (cleanupError) {
      console.warn("⚠️ Error limpiando temporales:", cleanupError.message);
    }

    // ✅ Respuesta final
    const tiendaUrl = `http://localhost/${nombreTienda}/`;
    const adminUrl = `http://localhost/${nombreTienda}/admin/`;

    console.log(`🎉 Deploy completado!`);
    console.log(`🌐 Tienda: ${tiendaUrl}`);
    console.log(`⚙️ Admin: ${adminUrl}`);

    res.json({
      success: true,
      tienda: nombreTienda,
      url: tiendaUrl,
      admin_url: adminUrl,
      ruta: destino,
      base_datos: dbImportada ? `${nombreTienda}_db` : null,
      mensaje: `Tienda ${nombreTienda} desplegada exitosamente`,
      archivos_procesados: {
        archivo_principal: archivoComprimido,
        carpeta_tienda: carpetaTiendaFinal ? path.basename(carpetaTiendaFinal) : null,
        archivo_sql: archivoSQL ? path.basename(archivoSQL) : null,
        zip_interno: archivoZipInterno ? path.basename(archivoZipInterno) : null
      },
      instrucciones: {
        acceso_tienda: tiendaUrl,
        acceso_admin: adminUrl,
        credenciales_admin: "Revisar documentación de PrestaShop o contactar con el estudiante"
      }
    });

  } catch (err) {
    console.error("❌ Error en deploy:", err);
    
    // Limpiar en caso de error
    try {
      const tempDir = path.join(__dirname, "temp");
      if (fs.existsSync(tempDir)) {
        await fsExtra.remove(tempDir);
      }
    } catch (cleanupError) {
      console.warn("⚠️ Error limpiando tras fallo:", cleanupError.message);
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Funciones auxiliares (agregar al final del archivo del servidor)
async function descomprimirRAR(archivoPath, destino) {
  let rarExtraido = false;

  try {
    console.log("📦 Intentando descomprimir RAR con 7-Zip...");
    const { spawn } = require('child_process');
    
    const sevenZipPaths = [
      'C:\\Program Files\\7-Zip\\7z.exe',
      'C:\\Program Files (x86)\\7-Zip\\7z.exe',
      '7z'
    ];

    for (const sevenZipPath of sevenZipPaths) {
      try {
        await new Promise((resolve, reject) => {
          const sevenZip = spawn(sevenZipPath, [
            'x', '-y', `-o${destino}`, archivoPath
          ], { 
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true 
          });
          
          sevenZip.on('close', (code) => {
            if (code === 0) {
              console.log("✅ RAR descomprimido con 7-Zip");
              resolve();
            } else {
              reject(new Error(`7-Zip falló con código: ${code}`));
            }
          });
          
          sevenZip.on('error', (err) => {
            reject(new Error(`Error ejecutando 7-Zip: ${err.message}`));
          });
          
          setTimeout(() => {
            sevenZip.kill();
            reject(new Error('Timeout con 7-Zip'));
          }, 180000);
        });
        
        rarExtraido = true;
        break;
        
      } catch (sevenZipError) {
        console.warn(`⚠️ 7-Zip en ${sevenZipPath} falló:`, sevenZipError.message);
        continue;
      }
    }
    
    if (!rarExtraido) {
      throw new Error("7-Zip no encontrado o falló");
    }
    
  } catch (error) {
    throw new Error(`No se pudo descomprimir el archivo RAR: ${error.message}`);
  }
}

function buscarArchivosRecursivo(directorio, profundidad = 0) {
  let carpetaCE = null;
  let archivoSQL = null;
  let archivoZipInterno = null;
  
  if (profundidad > 5) return { carpetaCE, archivoSQL, archivoZipInterno };

  try {
    const items = fs.readdirSync(directorio);
    
    for (const item of items) {
      const rutaCompleta = path.join(directorio, item);
      const stat = fs.lstatSync(rutaCompleta);

      if (stat.isDirectory()) {
        if (item.match(/^ce_[a-z]{3}$/i)) {
          console.log(`✅ Carpeta ce_* encontrada: ${item}`);
          carpetaCE = rutaCompleta;
        } else {
          const resultado = buscarArchivosRecursivo(rutaCompleta, profundidad + 1);
          if (resultado.carpetaCE && !carpetaCE) carpetaCE = resultado.carpetaCE;
          if (resultado.archivoSQL && !archivoSQL) archivoSQL = resultado.archivoSQL;
          if (resultado.archivoZipInterno && !archivoZipInterno) archivoZipInterno = resultado.archivoZipInterno;
        }
      } else if (stat.isFile()) {
        const itemLower = item.toLowerCase();
        
        if (itemLower.includes('_db') && itemLower.endsWith('.sql')) {
          console.log(`✅ Archivo SQL encontrado: ${item}`);
          archivoSQL = rutaCompleta;
        }
        else if (itemLower.match(/^ce_[a-z]{3}\.zip$/)) {
          console.log(`✅ Archivo ZIP interno encontrado: ${item}`);
          archivoZipInterno = rutaCompleta;
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ Error leyendo directorio:", error.message);
  }

  return { carpetaCE, archivoSQL, archivoZipInterno };
}

async function actualizarConfiguracionPrestashop(rutaTienda, nombreTienda, nombreDB) {
  try {
    const configPaths = [
      path.join(rutaTienda, 'app', 'config', 'parameters.php'),
      path.join(rutaTienda, 'config', 'settings.inc.php')
    ];
    
    let configEncontrado = false;

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        console.log(`🔧 Actualizando ${path.basename(configPath)}...`);
        let config = fs.readFileSync(configPath, 'utf8');
        
        if (configPath.includes('parameters.php')) {
          config = config.replace(/'database_host'\s*=>\s*'[^']*'/, "'database_host' => 'localhost'");
          config = config.replace(/'database_port'\s*=>\s*'[^']*'/, "'database_port' => '3306'");
          config = config.replace(/'database_user'\s*=>\s*'[^']*'/, "'database_user' => 'root'");
          config = config.replace(/'database_password'\s*=>\s*'[^']*'/, "'database_password' => ''");
          if (nombreDB) {
            config = config.replace(/'database_name'\s*=>\s*'[^']*'/, `'database_name' => '${nombreDB}'`);
          }
        } else {
          config = config.replace(/define\('_DB_SERVER_',\s*'[^']*'\)/, "define('_DB_SERVER_', 'localhost')");
          config = config.replace(/define\('_DB_USER_',\s*'[^']*'\)/, "define('_DB_USER_', 'root')");
          config = config.replace(/define\('_DB_PASSWD_',\s*'[^']*'\)/, "define('_DB_PASSWD_', '')");
          if (nombreDB) {
            config = config.replace(/define\('_DB_NAME_',\s*'[^']*'\)/, `define('_DB_NAME_', '${nombreDB}')`);
          }
        }

        fs.writeFileSync(configPath, config);
        configEncontrado = true;
        console.log(`✅ ${path.basename(configPath)} actualizado`);
      }
    }

    if (!configEncontrado) {
      console.log("ℹ️ No se encontraron archivos de configuración de PrestaShop");
    }

  } catch (error) {
    console.warn("⚠️ Error actualizando configuración de PrestaShop:", error.message);
  }
}

function obtenerEstructuraDirectorio(directorio, profundidad = 0) {
  if (profundidad > 1) return null;
  
  try {
    const items = fs.readdirSync(directorio);
    return items.map(item => {
      const rutaCompleta = path.join(directorio, item);
      try {
        const stat = fs.lstatSync(rutaCompleta);
        const resultado = {
          nombre: item,
          tipo: stat.isDirectory() ? 'directorio' : 'archivo'
        };
        
        if (stat.isDirectory() && profundidad < 1) {
          resultado.contenido = obtenerEstructuraDirectorio(rutaCompleta, profundidad + 1);
        }
        
        return resultado;
      } catch (statError) {
        return { nombre: item, tipo: 'error' };
      }
    });
  } catch (error) {
    return null;
  }
}

// 🔍 ENDPOINTS ADICIONALES

// Endpoint para listar tiendas desplegadas
app.get("/tiendas", (req, res) => {
  try {
    const tiendas = fs.readdirSync(HTDOCS_DIR, { withFileTypes: true })
      .filter(item => item.isDirectory() && item.name.startsWith('ce_'))
      .map(tienda => ({
        nombre: tienda.name,
        url: `http://localhost/${tienda.name}/`,
        admin_url: `http://localhost/${tienda.name}/admin/`,
        ruta: path.join(HTDOCS_DIR, tienda.name)
      }));

    res.json({
      success: true,
      tiendas_desplegadas: tiendas,
      total: tiendas.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para eliminar una tienda
app.delete("/tienda/:nombre", async (req, res) => {
  const { nombre } = req.params;
  
  try {
    if (!nombre.startsWith('ce_')) {
      return res.status(400).json({ error: "Solo se pueden eliminar tiendas con formato ce_xxx" });
    }

    const rutaTienda = path.join(HTDOCS_DIR, nombre);
    const dbName = `${nombre}_db`;

    // Eliminar carpeta
    if (fs.existsSync(rutaTienda)) {
      await fsExtra.remove(rutaTienda);
      console.log(`🗑️ Carpeta eliminada: ${rutaTienda}`);
    }

    // Eliminar base de datos
    const mysqlCmd = `mysql -u root -e "DROP DATABASE IF EXISTS ${dbName};"`;
    exec(mysqlCmd, (err) => {
      if (err) {
        console.warn(`⚠️ Error eliminando BD ${dbName}:`, err.message);
      } else {
        console.log(`🗑️ Base de datos eliminada: ${dbName}`);
      }
    });

    res.json({
      success: true,
      mensaje: `Tienda ${nombre} eliminada exitosamente`,
      carpeta_eliminada: rutaTienda,
      bd_eliminada: dbName
    });

  } catch (err) {
    console.error("❌ Error eliminando tienda:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
