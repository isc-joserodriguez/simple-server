const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

// Configura la conexión a MongoDB
mongoose
  .connect(
    'mongodb+srv://testMongo:testMongo@cluster0.h81et.mongodb.net/c17-API',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log('Conexión exitosa a MongoDB');
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB', error);
  });

// Definir el esquema y modelo de usuario
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', UserSchema);

// Configuración de Express para manejar solicitudes JSON
app.use(express.json());
app.use(cors());

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    // Verifica si el usuario ya existe en la base de datos
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    // Crea un nuevo usuario
    const user = new User({ firstName, lastName, email, password });

    const createdUser = await user.save();
    if (createdUser) {
      // Genera un token JWT válido por 1 hora
      const token = jwt.sign(
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        'secretKey',
        { expiresIn: '1h' }
      );

      res.json({ token });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de inicio de sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verifica las credenciales del usuario
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Genera un token JWT válido por 1 hora
    const token = jwt.sign(
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      'secretKey',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta protegida por JWT
app.get('/user', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find();
    // Verifica si el usuario ya existe en la base de datos
    if (!users.length) {
      return res.status(400).json({ error: 'No hay usuarios' });
    }

    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/user', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const existingUser = await User.findOne({ email });
    // Verifica si el usuario ya existe en la base de datos
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    const user = new User({ firstName, lastName, email, password: 'password' });

    const createdUser = await user.save();
    if (createdUser) {
      res.json({ message: 'Usuario registrado exitosamente' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/user/:id', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName,
        lastName,
        email,
      },
      {
        new: true,
      }
    );
    if (!user) {
      return res.status(400).json({ error: 'No existe el usuario' });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: 'No existe el usuario' });
  }
});

app.delete('/user/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
    });
    if (!user) {
      return res.status(400).json({ error: 'No existe el usuario' });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: 'Usuario no existe' });
  }
});

// Función de middleware para autenticar el token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res
      .status(401)
      .json({ error: 'Token de autenticación no provisto' });
  }

  jwt.verify(token, 'secretKey', (error, user) => {
    if (error) {
      return res.status(403).json({ error: 'Token de autenticación inválido' });
    }

    req.user = user;
    next();
  });
}

// Inicia el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000');
});
