const express = require('express');
const cors = require('cors');
const axios = require('axios');

const multer = require('multer');
const net = require('net');

const Minio = require('minio');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const { spawn  } = require('child_process');
const AdmZip = require('adm-zip');
const { createExtractorFromData } = require('node-unrar-js');

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
  accessKey: process.env.MINIO_ROOT_USER || 'admin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'admin123'
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

async function createAndImportDB(nombreArchivo) {
  try {
    const sqlZipPathDB = findFileRecursive(HTDOCS_DIR, new RegExp(`^${nombreArchivo}_db\\.sql(?:_[a-z0-9]+)?\\.zip$`, 'i'));
    const sqlZipPathBD = findFileRecursive(HTDOCS_DIR, new RegExp(`^${nombreArchivo}_bd\\.sql(?:_[a-z0-9]+)?\\.zip$`, 'i'));
    let sqlZipPath = null;
    let dbName = null;

    // Elegir el archivo ZIP existente
    if (fs.existsSync(sqlZipPathBD)) {
      sqlZipPath = sqlZipPathBD;
      dbName = `${nombreArchivo}_bd`;
    } else if (fs.existsSync(sqlZipPathDB)) {
      sqlZipPath = sqlZipPathDB;
      dbName = `${nombreArchivo}_db`;
    } else {
      console.log('⚠️ No se encontró SQL ZIP ni _bd ni _db');
      return false;
    }

    // Conectar a MySQL
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      multipleStatements: true
    });

    // Revisar si la DB ya existe
    const [rows] = await connection.query(`SHOW DATABASES LIKE ?`, [dbName]);
    if (rows.length > 0) {
      console.log(`✅ La base de datos ${dbName} ya existe, se omite importación`);
      await connection.end();
      return { success: true, message: 'DB ya importada' };
    }

    // Crear DB si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET latin1 COLLATE latin1_spanish_ci;`);
    console.log(`✅ Base de datos ${dbName} creada`);

    // Extraer SQL del ZIP
    const zip = new AdmZip(sqlZipPath);
    const entries = zip.getEntries();
    const sqlEntry = entries.find(e => e.entryName.endsWith('.sql'));
    if (!sqlEntry) {
      console.log('⚠️ No se encontró archivo .sql dentro del ZIP');
      await connection.end();
      return false;
    }

    const sqlContent = sqlEntry.getData().toString('utf-8');

    // Importar SQL
    await connection.query(`USE \`${dbName}\`;`);
    await connection.query(sqlContent);
    console.log(`✅ SQL importado en ${dbName}`);

    await connection.end();
    return true;

  } catch (err) {
    console.error('Error creando/importando DB:', err);
    return false;
  }
}

app.post('/deploy-db', extractUser, async (req, res) => {
  try {
    const { nombreArchivo } = req.body;
    const dbName = `${nombreArchivo}_db`;
    console.log("HOLA")
    const success = await createAndImportDB(nombreArchivo);

    if (success) {
      res.json({ success: true, message: 'Base de datos creada e importada' });
    } else {
      res.status(500).json({ success: false, message: 'No se pudo crear/importar la DB' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


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

const TMP_DIR = 'C:\\Users\\alici\\Downloads\\tmpUploads';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function findFileRecursive(dir, regex) {
  console.log("hola")
  const files = fs.readdirSync(dir, { withFileTypes: true });
  console.log("files. ", files)
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    console.log("fullpath: ", fullPath)
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
    console.log("📦 Bucket:", rawBucketName);

    // Crear bucket si no existe
    const exists = await minioClient.bucketExists(rawBucketName);
    if (!exists) {
      await minioClient.makeBucket(rawBucketName);
      console.log(`✅ Bucket ${rawBucketName} creado`);
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const fileExt = path.extname(originalName).toLowerCase();

    // Permisos según rol
    const isAdmin = req.user?.roles?.includes('admin');
    let allowedExtensions = ['.zip', '.rar'];
    if (isAdmin) allowedExtensions.push('.xlsx');

    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ message: `Solo se permiten archivos: ${allowedExtensions.join(', ')}` });
    }

    if (fileExt === '.xlsx') {
      const fileStream = fs.createReadStream(filePath);
      const stat = fs.statSync(filePath);
      await minioClient.putObject(rawBucketName, originalName, fileStream, stat.size);
      fs.unlinkSync(filePath);
      console.log(`✅ Archivo .xlsx subido correctamente a ${rawBucketName}`);
      return res.json({
        success: true,
        message: `Archivo ${originalName} subido correctamente al bucket ${rawBucketName}`,
      });
    }
    // Carpeta temporal para extracción
    const tempFolder = path.join(TMP_DIR, path.basename(filePath, fileExt));
    fs.mkdirSync(tempFolder, { recursive: true });

    // Extraer ZIP o RAR del alumno
    if (fileExt === '.zip') {
      const alumnoZip = new AdmZip(filePath);
      alumnoZip.extractAllTo(tempFolder, true);
      console.log(`📂 ZIP del alumno extraído en: ${tempFolder}`);
    } else if (fileExt === '.rar') {
      console.log(`📂 RAR del alumno extraído en: ${tempFolder}`);
      await descomprimirRAR(filePath, tempFolder);
    }

    // Buscar archivos internos
    const tiendaZipPath = findFileRecursive(tempFolder, /^ce_[a-z]{2,3}(_[a-z0-9]+)?\.(zip|rar)$/i);
    const sqlZipPath = findFileRecursive(tempFolder, /^ce_[a-z]{2,3}_(bd|db)\.sql(_[a-z0-9]+)?(\.zip)?$/i);

    if (!tiendaZipPath || !sqlZipPath) {
      return res.status(400).json({ message: 'No se encontraron los archivos ce_XXX.zip/rar o ce_XXX_db.sql.zip' });
    }

    const nombreTienda = path.basename(tiendaZipPath).replace(/\.(zip|rar)$/i, '').replace(/_[a-z0-9]+$/i, '');
    const destinoTienda = path.join(HTDOCS_DIR, nombreTienda);
    const destinoSQL = path.join(HTDOCS_DIR, path.basename(sqlZipPath));

    const tempExtract = path.join(TMP_DIR, `extract_${nombreTienda}`);
    fsExtra.ensureDirSync(tempExtract);

    // Extraer tienda en carpeta temporal
    const tiendaExt = path.extname(tiendaZipPath).toLowerCase();
    if (tiendaExt === '.zip') {
      const tiendaZip = new AdmZip(tiendaZipPath);
      tiendaZip.extractAllTo(tempExtract, true);
    } else if (tiendaExt === '.rar') {
      await descomprimirRAR(tiendaZipPath, tempExtract);
    }

    // Mover solo el contenido de la carpeta interna a destinoTienda
    const innerFolder = fs.readdirSync(tempExtract).find(f => f.toLowerCase().startsWith('ce_'));
    if (!innerFolder) throw new Error('No se encontró la carpeta interna ce_XXX en el ZIP/RAR');
    const innerPath = path.join(tempExtract, innerFolder);
    fsExtra.ensureDirSync(destinoTienda);
    fsExtra.copySync(innerPath, destinoTienda, { overwrite: true });
    console.log(`✅ Tienda ${nombreTienda} desplegada correctamente en ${destinoTienda}`);

    // Copiar SQL
    if (!fs.existsSync(destinoSQL)) {
      fs.copyFileSync(sqlZipPath, destinoSQL);
      console.log(`✅ Copiado ${path.basename(sqlZipPath)} a htdocs`);
    }

    // Limpieza temporal
    await fsExtra.remove(tempFolder);
    await fsExtra.remove(tempExtract);

    // Subir ZIP/RAR original a MinIO
    const fileStream = fs.createReadStream(req.file.path);
    const stat = fs.statSync(req.file.path);
    await minioClient.putObject(rawBucketName, originalName, fileStream, stat.size);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: fileExt === '.zip' ? 
        `Tienda ${nombreTienda} desplegada correctamente en htdocs` :
        `Archivo ${originalName} subido correctamente al bucket`,
      tienda: fileExt === '.zip' ? nombreTienda : null,
      url: fileExt === '.zip' ? `http://localhost/${nombreTienda}/` : null,
    });

  } catch (err) {
    console.error("❌ Error en upload:", err);
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

    stream.on('data', obj => {
      // Normaliza cada nombre a UTF-8
      const fixedName = Buffer.from(obj.name, "latin1").toString("utf8");
      files.push(fixedName);
    });

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

async function descomprimirRAR(archivoPath, destino) {
  console.log("📦 Intentando descomprimir RAR...");

  // Intentar primero con 7-Zip
  try {
    await new Promise((resolve, reject) => {
      const sevenZip = spawn('7z', ['x', '-y', `-o${destino}`, archivoPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });

      sevenZip.stdout.on('data', (data) => process.stdout.write(data));
      sevenZip.stderr.on('data', (data) => process.stderr.write(data));

      sevenZip.on('close', (code) => {
        if (code === 0) {
          console.log("✅ RAR descomprimido correctamente con 7-Zip en:", destino);
          resolve();
        } else {
          reject(new Error(`7-Zip falló con código: ${code}`));
        }
      });

      sevenZip.on('error', (err) => {
        reject(new Error(`Error ejecutando 7-Zip: ${err.message}`));
      });
    });

    return; // ✅ Éxito, no continuar a fallback
  } catch (err) {
    console.warn("⚠️ Falló 7-Zip, intentando con node-unrar-js:", err.message);
  }

  // Fallback: node-unrar-js (para entornos sin 7z o errores de compatibilidad)
  try {
    console.log("📦 Descomprimiendo RAR con node-unrar-js...");
    const data = fs.readFileSync(archivoPath);
    const extractor = await createExtractorFromData({ data });

    const listResult = extractor.getFileList();
    if (listResult.state !== "SUCCESS") {
      throw new Error("No se pudo leer el contenido del RAR");
    }

    const extractResult = extractor.extract();
    if (extractResult.state !== "SUCCESS") {
      throw new Error("Fallo al extraer los archivos del RAR");
    }

    for (const file of extractResult.files) {
      let relativePath = file.fileHeader.name.replace(/\\/g, '/');
      relativePath = relativePath.replace(/^ce_[a-z]{2,3}\//i, '');

      const filePath = path.join(destino, relativePath);

      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      if (file.extraction) {
        fs.writeFileSync(filePath, Buffer.from(file.extraction));
      }
    }

    console.log("✅ RAR descomprimido correctamente con node-unrar-js en:", destino);
  } catch (error) {
    console.error("❌ Error al descomprimir RAR:", error);
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
        if (item.match(/^ce_[a-z]{2,3}$/i)) {
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
        
        if ((itemLower.includes('_db') || itemLower.includes('_bd')) && itemLower.endsWith('.sql')) {
          console.log(`✅ Archivo SQL encontrado: ${item}`);
          archivoSQL = rutaCompleta;
        }
        else if (itemLower.match(/^ce_[a-z]{2,3}(_\d+)?\.zip$/)) {
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

app.delete('/bucket-file/:bucketName/:fileName', async (req, res) => {
  const { bucketName, fileName } = req.params;
  try {
    await minioClient.removeObject(bucketName, decodeURIComponent(fileName));
    res.json({ message: `Archivo ${fileName} borrado correctamente` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al borrar archivo" });
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

async function getStudentCount() {
  try {
    const response = await axios.get('http://localhost:3001/api/users');
    return response.data.length; // Número de usuarios
  } catch (err) {
    console.error('Error obteniendo usuarios de Keycloak:', err.message);
    return 0;
  }
}

async function getBackupCount() {
  try {
    const bucketName = 'backups';
    const objectsStream = minioClient.listObjectsV2(bucketName, '', true);

    let count = 0;
    for await (const obj of objectsStream) {
      count++;
    }

    return count;
  } catch (err) {
    console.error('Error contando backups en MinIO:', err.message);
    return 0;
  }
}


app.get('/system/stats', async (req, res) => {
  const keycloakStatus = await checkPort('localhost', 8180);
  const minioStatus = await checkPort('localhost', 9001);

  res.json({
    backendVersion: '1.0.0',
    keycloakStatus: keycloakStatus ? 'ON' : 'OFF',
    minioStatus: minioStatus ? 'ON' : 'OFF',
    students: await getStudentCount(),
    backups: await getBackupCount()
  });
});


function checkPort(host, port) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1000); // 1s
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));
    socket.connect(port, host);
  });
}

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
