// rateLimiter.js

let requestQueue = [];  // Очередь для обработки запросов
let requestCount = 0;   // Счетчик текущих запросов
const requestLimit = 27; // Лимит запросов в секунду
const timeoutDuration = 1000; // 1 секунда для сброса лимита

// Функция для сброса счетчика и обработки очереди
const startProcessingQueue = () => {
    setInterval(() => {
        requestCount = 0; // Сбрасываем счетчик запросов
        if (requestQueue.length > 0) {
            processQueue(); // Обрабатываем запросы из очереди
        }
    }, timeoutDuration);
};

// Функция для обработки запросов из очереди
const processQueue = () => {
    // Пока есть запросы в очереди и лимит запросов не достигнут
    while (requestQueue.length > 0 && requestCount < requestLimit) {
        const { handler, args } = requestQueue.shift(); // Извлекаем первый запрос из очереди
        handler(...args); // Вызываем обработчик с аргументами
        requestCount++; // Увеличиваем счетчик запросов
    }
};

// Функция для контроля запросов
const requestControl = (handler, ...args) => {
    if (requestCount >= requestLimit) {
        // Если лимит запросов достигнут, добавляем запрос в очередь
        requestQueue.push({ handler, args });
    } else {
        // Если лимит не достигнут, обрабатываем запрос сразу
        handler(...args);
        requestCount++;
    }
};

// Экспорт функций
module.exports = {
    requestControl,
    startProcessingQueue
};

