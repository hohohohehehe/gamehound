const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Инициализация базы данных
const db = new sqlite3.Database('./database/gamehound.db');

// Создание таблиц
db.serialize(() => {
  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'developer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица проектов
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    developer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (developer_id) REFERENCES users (id)
  )`);

  // Таблица задач
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    project_id INTEGER,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (assigned_to) REFERENCES users (id)
  )`);
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = user;
    next();
  });
};

// Маршруты аутентификации
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET);
        res.json({ 
          message: 'Пользователь создан', 
          token,
          user: { id: this.lastID, email, name }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({
      message: 'Вход выполнен',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  });
});

// CRUD для проектов
app.get('/api/projects', authenticateToken, (req, res) => {
  db.all(
    `SELECT p.*, u.name as developer_name 
     FROM projects p 
     LEFT JOIN users u ON p.developer_id = u.id 
     WHERE p.developer_id = ? OR ? = (SELECT id FROM users WHERE role = 'lead')`,
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { title, description, status, progress } = req.body;
  
  db.run(
    'INSERT INTO projects (title, description, status, progress, developer_id) VALUES (?, ?, ?, ?, ?)',
    [title, description, status, progress, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Проект создан' });
    }
  );
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const { title, description, status, progress } = req.body;
  
  db.run(
    `UPDATE projects SET title = ?, description = ?, status = ?, progress = ? 
     WHERE id = ? AND developer_id = ?`,
    [title, description, status, progress, req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Проект обновлен' });
    }
  );
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM projects WHERE id = ? AND developer_id = ?',
    [req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Проект удален' });
    }
  );
});


app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});