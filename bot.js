const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const sequelize = require('./database');
const User = require('./models/user');
const app = require('./server');
const crypto = require('crypto');
const { requestControl, startProcessingQueue } = require('./rateLimiter'); // Подключаем контроллер запросов

const initializeBot = require('./botSingleton'); 
const bot = initializeBot(); // Получаем единственный экземпляр бота

// Параметры для пакетной записи
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 2000;
let usersBuffer = [];

// Функция для обработки одного запроса
const handleRequest = async (chatId, msg) => {
    try {
        const user = await User.findOne({ where: { userid: chatId } });

        if (user) {
            // Пользователь уже существует, не отправляем сообщение
            return;
        }

        const userData = {
            userid: chatId,
            username: msg.from.username || null,
            lastname: msg.from.last_name || null,
        };

        // Добавляем пользователя в буфер
        await addToBuffer(userData);

        // Используем requestControl для контроля отправки сообщения через bot.sendMessage
        requestControl(async () => {
            await bot.sendMessage(chatId, 'Hello, friend! Head over to the miniapp and create your pixel avatar.', {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: 'Start App',
                            web_app: { url: 'https://tugita.online' }
                        }]
                    ]
                }
            });
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего запроса.');
    }
};

// Функция для добавления пользователя в буфер
async function addToBuffer(userData) {
    usersBuffer.push(userData);

    if (usersBuffer.length >= BATCH_SIZE) {
        await batchInsertUsers(usersBuffer);
        usersBuffer = [];
    }
}



// Таймер для регулярной записи данных, даже если буфер не заполнен
setInterval(async () => {
    if (usersBuffer.length > 0) {
        await batchInsertUsers(usersBuffer);
        usersBuffer = [];
    }
}, FLUSH_INTERVAL);

// Функция пакетной вставки пользователей
async function batchInsertUsers(users) {
    if (users.length > 0) {
        try {
            await User.bulkCreate(users, { ignoreDuplicates: true });
        } catch (error) {
            // Выводим только ошибки
            console.error(`Ошибка при пакетной записи пользователей: ${error.message}`);
        }
    }
}






// Botik - обработка команды /start с ограничением запросов
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    handleRequest(chatId, msg); // Обрабатываем запрос без использования requestControl
});

// Запуск обработки очереди с интервалом в 1 секунду
startProcessingQueue();

module.exports = bot;

