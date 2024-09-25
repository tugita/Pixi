//server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

// Импортируем бота
const bot = require('./bot');

const app = express();
const port = process.env.PORT || 3000;


// Увеличиваем лимит для JSON данных до 10 MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' })); // Увеличиваем лимит для JSON до 10 MB

// Обработка вебхуков от Telegram
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);  // Передача обновления в бот
    res.sendStatus(200);
});

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public'))); // Путь для обслуживания файлов
app.use('/downloads', express.static(path.join(__dirname, 'downloads'))); // Путь для обслуживания файлов

// Подключение маршрутов
const routes = require('./routes');
app.use('/', routes);

// Устанавливаем переменную окружения в 'production' для отключения детальных сообщений об ошибках
app.set('env', 'production');

// Глобальный обработчик ошибок для перехвата ошибок парсинга JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        res.status(400).send('Bad Request');
        return;
    }
    next();
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер работает на http://localhost:${port}`);
});

