// botSingleton.js

const TelegramBot = require('node-telegram-bot-api');

let botInstance = null;

const initializeBot = () => {
    if (!botInstance) {
        console.log('Инициализируем Telegram-бота...'); 
        botInstance = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
    } else {
        console.log('Используем существующий экземпляр бота.'); 
    }
    return botInstance;
};


module.exports = initializeBot;

