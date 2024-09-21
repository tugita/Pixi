// database.js
const { Sequelize } = require('sequelize');

// Используем SQLite и указываем имя файла базы данных
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite', // Имя файла базы данных
    logging: false, // отключаем вывод логов SQL в консоль
});

// Проверка соединения
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Соединение с базой данных успешно установлено.');
    } catch (error) {
        console.error('Не удалось подключиться к базе данных:', error);
    }
}

testConnection();

module.exports = sequelize;

