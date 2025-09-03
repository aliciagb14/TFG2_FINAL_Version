const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Minio = require('minio');
const fs = require('fs');
const XLSX = require('xlsx');

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


app.post('/upload/:bucketName', extractUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rawBucketName = req.params.bucketName || req.body.bucketName;
    console.log("bucketName", rawBucketName)
    // Crear bucket si no existe
    const exists = await minioClient.bucketExists(rawBucketName);
    if (!exists) {
      await minioClient.makeBucket(rawBucketName);
      console.log(`✅ Bucket ${rawBucketName} creado`);
    }

    // Subir fichero
    const fileStream = fs.createReadStream(req.file.path);
    const stat = fs.statSync(req.file.path);

    await minioClient.putObject(rawBucketName, req.file.originalname, fileStream, stat.size);

    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Archivo subido', bucket: rawBucketName, file: req.file.originalname });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en subida', error: error.message });
  }
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


app.listen(3000, () => {
  console.log('Server started on port 3000');
});