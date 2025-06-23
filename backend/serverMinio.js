const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Minio = require('minio');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
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
  accessKey: 'cDop9p81OOlFLC6racUr',
  secretKey: 'Nu73OuRus4DyYE8ofEyN2XZ2DakslpQ84MHT2ocN'
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

app.post('/upload', extractUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { username, roles } = req.user;
    const isAdmin = roles.includes('admin');
    const isAlumno = roles.includes('alumno');

    let bucketName;

    if (isAdmin) {
      if (!req.file.originalname.endsWith('.xlsx')) {
        return res.status(400).json({ message: 'Admins solo pueden subir .xlsx' });
      }
      bucketName = 'alumnos';
    } else if (isAlumno) {
      if (!req.file.originalname.endsWith('.zip')) {
        return res.status(400).json({ message: 'Alumnos solo pueden subir .zip' });
      }
      bucketName = username.toLowerCase();
    } else {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Crear bucket si no existe
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) await minioClient.makeBucket(bucketName);

    // Subir el archivo
    const fileStream = fs.createReadStream(req.file.path);
    const stat = fs.statSync(req.file.path);

    await minioClient.putObject(bucketName, req.file.originalname, fileStream, stat.size);

    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Archivo subido', bucket: bucketName, file: req.file.originalname });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en subida', error: error.message });
  }
});

app.get('/alumnos', extractUser, async (req, res) => {
  try {
    const { roles } = req.user;
    const isAdmin = roles.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Solo los admins pueden ver alumnos' });
    }

    const bucketName = 'alumnos';

    const objectsStream = minioClient.listObjectsV2(bucketName, '', true);

    let fileFound = null;

    for await (const obj of objectsStream) {
      if (obj.name.endsWith('.xlsx')) {
        fileFound = obj.name;
        break;
      }
    }

    if (!fileFound) {
      return res.status(404).json({ message: 'No se encontró archivo .xlsx en bucket alumnos' });
    }

    const tempFilePath = `./temp/${fileFound}`;

    await new Promise((resolve, reject) => {
      minioClient.fGetObject(bucketName, fileFound, tempFilePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
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


app.listen(3000, () => {
  console.log('Server started on port 3000');
});
