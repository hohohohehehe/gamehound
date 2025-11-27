const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Сервер работает! GameHound API готов к работе!' });
});

// Projects routes (simplified for start)
app.get('/api/projects', (req, res) => {
    res.json([
        { id: 1, name: 'Silksong', status: 'active', progress: 85 },
        { id: 2, name: 'Half-life 3', status: 'planned', progress: 10 }
    ]);
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 GameHound сервер запущен на http://localhost:${PORT}`);
});