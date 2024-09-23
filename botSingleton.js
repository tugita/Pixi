// botSingleton.js

const TelegramBot = require('node-telegram-bot-api');

let botInstance;

function initializeBot() {
    if (!botInstance) {
        const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

        // Проверяем наличие домена в переменных окружения
        const webhookUrl = `${process.env.APP_URL}/bot${process.env.BOT_TOKEN}`;

        // Устанавливаем URL вебхука
        bot.setWebHook(webhookUrl)
            .then(() => {
                console.log(`Webhook успешно установлен на ${webhookUrl}`);
            })
            .catch((error) => {
                console.error('Ошибка при установке вебхука:', error);
            });

        botInstance = bot;
    }
    return botInstance;
}

module.exports = initializeBot;

