const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Импортируем бота
const bot = require('./bot');

const app = express();
const port = process.env.PORT || 3000;

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public'))); // Путь для обслуживания файлов
app.use('/downloads', express.static(path.join(__dirname, 'downloads'))); // Путь для обслуживания файлов

// Увеличиваем лимит для JSON данных до 10 MB
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' })); // Увеличиваем лимит для JSON до 10 MB

// Подключение маршрутов
const routes = require('./routes');
app.use('/', routes);

// Устанавливаем переменную окружения в 'production' для отключения детальных сообщений об ошибках
app.set('env', 'production');

// Глобальный обработчик ошибок для перехвата ошибок парсинга JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        // Игнорируем запрос без отправки ответа или отправляем минимальный ответ
        res.status(400).send('Bad Request');
        return;
    }
    next();
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер работает на http://localhost:${port}`);
});

