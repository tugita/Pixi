require('dotenv').config();
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bot = require('./bot');
const User = require('./models/user');
const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');
const { requestControl, startProcessingQueue } = require('./rateLimiter'); // Подключаем контроллер запросов

// Инициализация переменных и настроек
const BOT_TOKEN = process.env.BOT_TOKEN;

// Функция для валидации initData
function validateInitData(initData, botToken) {
    const params = initData.split('&');
    const data = {};
    for (const param of params) {
        const [key, value] = param.split('=');
        data[key] = decodeURIComponent(value);
    }

    const hash = data.hash;
    delete data.hash;

    const keys = Object.keys(data).sort();
    const dataCheckString = keys.map(key => `${key}=${data[key]}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

    const hmac = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return hmac === hash ? data : null;
}

// Функция для проверки данных перед обработкой
const validateRequestData = (req) => {
    const { image } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('initData ')) {
        return false;
    }

    const initData = authHeader.split(' ')[1];

    const parsedInitData = initData.split('&').reduce((acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});

    if (!parsedInitData.user) {
        return false;
    }

    try {
        const userInfo = JSON.parse(parsedInitData.user);
        const userId = userInfo.id;

        if (!userId || !image || typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,')) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
};

// Функция для обработки одного запроса
const handleRequest = async (req, res) => {
    if (!validateRequestData(req)) {
        return res.status(400).send({ message: 'Некорректные данные запроса.' }); // Возвращаем 400 если данные некорректны
    }

    const { image } = req.body;
    const authHeader = req.headers.authorization;
    const initData = authHeader.split(' ')[1];
    const botToken = process.env.BOT_TOKEN;

    try {
        // Парсим initData, чтобы извлечь данные пользователя
        const parsedInitData = initData.split('&').reduce((acc, param) => {
            const [key, value] = param.split('=');
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});

        const userInfo = JSON.parse(parsedInitData.user);
        const userId = userInfo.id;

        // Находим пользователя в базе данных
        const user = await User.findOne({ where: { userid: userId } });
        if (!user) return res.status(404).send({ message: 'Пользователь не найден.' }); // Возвращаем 404 если пользователя нет

        // Проверка времени последней отправки изображения (кулдаун)
        const now = new Date();
        if (user.lastImageSent) {
            const lastSent = new Date(user.lastImageSent);
            const timeDiff = (now - lastSent) / 1000 / 60; // разница во времени в минутах
            const cooldownTime = 2; // Время кулдауна в минутах

            if (timeDiff < cooldownTime) {
                const remainingTime = cooldownTime - timeDiff; // Рассчитываем оставшееся время
                return res.status(429).send({ 
                    message: `Подождите ${Math.ceil(remainingTime)} минут, чтобы отправить новое изображение.`,
                    remainingTime: Math.ceil(remainingTime) // Возвращаем оставшееся время
                }); // Возвращаем 429 при активном кулдауне с оставшимся временем
            }
        }

        // Декодируем изображение
        const base64Data = image.replace(/^data:image\/jpeg;base64,/, '');
        const downloadsDir = path.join(__dirname, 'public', 'downloads');
        const fileName = `${userId}_processed.jpg`;
        const filePathLocal = path.join(downloadsDir, fileName);

        // Сохраняем изображение на сервере
        fs.writeFileSync(filePathLocal, base64Data, 'base64');

        // Отправляем изображение через бот
        await bot.sendPhoto(userId, filePathLocal, { caption: "Here's your processed image! Set up a profile picture! And get back in the game: @notpixel" });

        // Удаляем изображение после отправки
        fs.unlink(filePathLocal, (err) => {
            if (err) {
                console.error('Ошибка при удалении изображения:', err);
            } else {
                console.log('Изображение успешно удалено.');
            }
        });

        // Обновляем время последней отправки изображения
        user.lastImageSent = now;
        await user.save();

        res.status(200).send({ message: 'Изображение отправлено!' });
    } catch (error) {
        console.error('Ошибка при сохранении или отправке изображения:', error);
        return res.status(500).send({ message: 'Ошибка при отправке изображения.' });
    }
};

// Маршрут для обработки отправки изображения с учетом ограничения запросов
router.post('/sendProcessedImage', (req, res) => {
    requestControl(handleRequest, req, res); // Используем контроллер запросов
});

// Главная страница
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка запроса на отображение фото профиля
router.get('/showProfilePhoto', (req, res) => {
    const { userId } = req.query;
    const filePath = path.join(__dirname, 'public', 'downloads', `${userId}.png`);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, (err) => {
            if (!err) {
                fs.unlink(filePath, (err) => {
                    if (!err) {
                        console.log(`Фото профиля пользователя ${userId} удалено.`);
                    }
                });
            }
        });
    } else {
        res.status(404).send('Фото профиля не найдено.');
    }
});

// Маршрут для загрузки и сохранения фото профиля
router.get('/sendProfilePhoto', async (req, res) => {
    const userId = req.query.userId;

    try {
        const userProfilePhotosResponse = await bot.getUserProfilePhotos(userId);
        const photos = userProfilePhotosResponse.photos;

        if (photos.length > 0) {
            const fileId = photos[0][photos[0].length - 1].file_id;
            const filePathResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile`, {
                params: { file_id: fileId }
            });
            const filePath = filePathResponse.data.result.file_path;

            const fileResponse = await axios.get(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`, {
                responseType: 'arraybuffer'
            });

            const fileName = `${userId}.png`;
            const filePathLocal = path.join(__dirname, 'public/downloads', fileName);

            await sharp(fileResponse.data)
                .png()
                .toFile(filePathLocal);

            res.json({ success: true, filePath: filePathLocal });
        } else {
            res.json({ success: false, message: 'Фото профиля не найдено' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Запуск обработки очереди с интервалом в 1 секунду
startProcessingQueue();

module.exports = router;

