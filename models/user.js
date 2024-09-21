const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
    userid: {
        type: DataTypes.BIGINT,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastname: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastImageSent: {
        type: DataTypes.DATE, // Добавляем поле для отслеживания последней отправки изображения
        allowNull: true,
    }
});

module.exports = User;

