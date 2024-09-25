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

// Функция для загрузки файла на DigitalOcean Spaces
async function uploadFile(prefix, file, expire) {
    const ext = '.jpg'; // Используем фиксированное расширение, так как мы загружаем JPEG
    const fileName = `${Date.now()}${ext}`; // Генерируем имя файла
    const finalPath = `api-clicker/${prefix}/${fileName}`;

    const s3 = getS3();
    const params = {
        Bucket: 'cobuild', // Ваш Bucket в DigitalOcean Spaces
        Key: finalPath,
        Body: file.buffer, // Используем буфер файла
        ACL: 'public-read',
        ContentType: file.mimetype || 'image/jpeg', // Указываем тип контента
    };

    if (expire) {
        params.Expires = new Date(expire);
    }

    try {
        // Загружаем файл
        await s3.putObject(params).promise();
        return `https://cdn.joincommunity.xyz/${finalPath}`;
    } catch (error) {
        throw new Error(`Ошибка загрузки файла: ${error.message}`);
    }
}

module.exports = {
    uploadFile,
};

