const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Разрешаем CORS
app.use(cors());

// Middleware для парсинга JSON
app.use(express.json());

// Раздаем статические файлы из текущей директории
app.use(express.static(__dirname));

// Тестовый endpoint для проверки сервера
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/test',
            '/api/test-images', 
            '/api/workouts',
            '/api/workouts/:id',
            '/images/:filename'
        ]
    });
});

// Тестовый endpoint для проверки изображений
app.get('/api/test-images', (req, res) => {
    const imagesDir = path.join(__dirname, 'images');
    
    try {
        if (!fs.existsSync(imagesDir)) {
            return res.json({ 
                error: 'Images directory not found',
                path: imagesDir 
            });
        }
        
        const files = fs.readdirSync(imagesDir);
        res.json({
            message: 'Images directory exists',
            path: imagesDir,
            files: files
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error reading images directory',
            details: error.message 
        });
    }
});

// Вспомогательная функция для получения имени изображения по типу
function getImageNameByType(type) {
    if (!type) return 'workout.jpg';
    
    const typeLower = type.toLowerCase().trim();
    const imageMap = {
        'cardio': 'cardio.jpeg',
        'strength': 'strength.jpeg',
        'yoga': 'yoga.jpeg',
        'stretching': 'stretching.jpeg',
        'hiit': 'hiit.jpeg',  // Используем hiit.jpeg
        'hitt': 'hiit.jpeg',  // Используем hiit.jpeg
        'powerlifting': 'power-lifting.jpeg',
        'power-lifting': 'power-lifting.jpeg',
        'power lifting': 'power-lifting.jpeg',
        'default': 'workout.jpg'
    };
    
    return imageMap[typeLower] || imageMap['default'];
}

// Функция для проверки существования файла
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}

// API endpoint для тренировок
app.get('/api/workouts', (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'db.json');
        
        // Проверяем существует ли файл
        if (!fileExists(dbPath)) {
            console.error('db.json not found at:', dbPath);
            return res.status(404).json({ error: 'Database not found' });
        }
        
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(rawData);
        
        if (!dbData.workouts || !Array.isArray(dbData.workouts)) {
            return res.json([]);
        }
        
        // Добавляем полные URL к изображениям
        const workoutsWithImages = dbData.workouts.map(workout => {
            const imageName = getImageNameByType(workout.type);
            
            return {
                ...workout,
                image: `http://localhost:${PORT}/images/${imageName}`
            };
        });
        
        console.log(`Returning ${workoutsWithImages.length} workouts`);
        res.json(workoutsWithImages);
        
    } catch (error) {
        console.error('Error reading db.json:', error);
        res.status(500).json({ 
            error: 'Failed to load workouts',
            details: error.message 
        });
    }
});

// API endpoint для одной тренировки
app.get('/api/workouts/:id', (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'db.json');
        
        if (!fileExists(dbPath)) {
            return res.status(404).json({ error: 'Database not found' });
        }
        
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(rawData);
        const workout = dbData.workouts.find(w => w.id == req.params.id);
        
        if (workout) {
            const imageName = getImageNameByType(workout.type);
            
            // Добавляем полный URL к изображению
            workout.image = `http://localhost:${PORT}/images/${imageName}`;
            
            res.json(workout);
        } else {
            res.status(404).json({ error: 'Workout not found' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint для пользователей
app.get('/api/users', (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'db.json');
        
        if (!fileExists(dbPath)) {
            return res.status(404).json({ error: 'Database not found' });
        }
        
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(rawData);
        res.json(dbData.users || []);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint для входа
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const dbPath = path.join(__dirname, 'db.json');
        
        if (!fileExists(dbPath)) {
            return res.status(404).json({ error: 'Database not found' });
        }
        
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(rawData);
        const users = dbData.users || [];
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            // Не возвращаем пароль
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API endpoint для регистрации
app.post('/api/users', (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const dbPath = path.join(__dirname, 'db.json');
        
        if (!fileExists(dbPath)) {
            return res.status(404).json({ error: 'Database not found' });
        }
        
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(rawData);
        
        // Проверяем, нет ли уже пользователя с таким email
        const existingUser = (dbData.users || []).find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Создаем нового пользователя
        const newUser = {
            id: (dbData.users || []).length + 1,
            firstName,
            lastName,
            email,
            password
        };
        
        // Добавляем пользователя
        if (!dbData.users) dbData.users = [];
        dbData.users.push(newUser);
        
        // Сохраняем в файл
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
        
        // Не возвращаем пароль
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Обработка 404 для API
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
    console.log(` Current directory: ${__dirname}`);
    console.log(` Images available at: http://localhost:${PORT}/images/`);
    console.log(` Pages available at: http://localhost:${PORT}/pages/`);
    console.log(` API endpoints:`);
    console.log(`   - GET  /api/test`);
    console.log(`   - GET  /api/test-images`);
    console.log(`   - GET  /api/workouts`);
    console.log(`   - GET  /api/workouts/:id`);
    console.log(`   - GET  /api/users`);
    console.log(`   - POST /api/login`);
    console.log(`   - POST /api/users`);
    console.log(`\n Для проверки:`);
    console.log(`   1. Откройте: http://localhost:${PORT}/api/test`);
    console.log(`   2. Откройте: http://localhost:${PORT}/pages/workouts.html`);
});