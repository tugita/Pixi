//doSpaceService.js
const AWS = require('aws-sdk');
const path = require('path');
const dotenv = require('dotenv');

// Подключаем переменные окружения
dotenv.config();

// Функция для создания экземпляра S3 с конфигурацией для DigitalOcean Spaces
function getS3() {
    const spacesEndpoint = new AWS.Endpoint('ams3.digitaloceanspaces.com');
    return new AWS.S3({
        endpoint: spacesEndpoint.href,
        credentials: new AWS.Credentials({
            accessKeyId: process.env.cdn_key,
            secretAccessKey: process.env.cdn_secret_key,
        }),
    });
}

// Функция для загрузки оригинального файла на DigitalOcean Spaces
async function uploadOriginalFile(userId, file) {
    const ext = '.jpg'; // Фиксированное расширение
    const fileName = `${userId}${ext}`; // Имя файла — userId.jpg
    const finalPath = `api-clicker/tg/avatars/${fileName}`; // Путь к файлу

    const s3 = getS3();
    const params = {
        Bucket: 'cobuild',
        Key: finalPath,
        Body: file.buffer,
        ACL: 'public-read',
        ContentType: file.mimetype || 'image/jpeg',
    };

    try {
        await s3.putObject(params).promise();
        return `https://cdn.joincommunity.xyz/${finalPath}`;
    } catch (error) {
        throw new Error(`Ошибка загрузки оригинального файла: ${error.message}`);
    }
}

// Функция для загрузки пикселизированного файла на DigitalOcean Spaces
async function uploadPixelatedFile(userId, pixelatedBuffer) {
    const ext = '.jpg'; // Фиксированное расширение
    const fileName = `${userId}${ext}`; // Имя файла — userId.jpg
    const finalPath = `api-clicker/tg/avatars/pixel/${fileName}`; // Путь к пикселизированному файлу

    const s3 = getS3();
    const params = {
        Bucket: 'cobuild',
        Key: finalPath,
        Body: pixelatedBuffer,
        ACL: 'public-read',
        ContentType: 'image/jpeg',
    };

    try {
        await s3.putObject(params).promise();
        return `https://cdn.joincommunity.xyz/${finalPath}`;
    } catch (error) {
        throw new Error(`Ошибка загрузки пикселизированного файла: ${error.message}`);
    }
}


module.exports = {
    uploadOriginalFile,
    uploadPixelatedFile,
};


