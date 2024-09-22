let requestQueue = [];  // Очередь для обработки запросов
let requestCount = 0;   // Счетчик текущих запросов
let totalProcessedRequests = 0;  // Общее количество обработанных запросов
let isRateLimited = false; // Флаг для отслеживания состояния ограничения запросов
const requestLimit = 27; // Лимит запросов в секунду
const timeoutDuration = 1000; // 1 секунда для сброса лимита

// Функция для сброса счетчика и обработки очереди
const startProcessingQueue = () => {
    setInterval(() => {
        if (isRateLimited) return; // Если действует ограничение, пропускаем обработку

        // Сбрасываем счетчик запросов
        requestCount = 0;

        // Если в очереди есть запросы, обрабатываем их
        if (requestQueue.length > 0) {
            processQueue(); // Обрабатываем запросы из очереди
        }

        // Логирование обновляемой строки в консоли
        process.stdout.write(`Запросов в очереди: ${requestQueue.length}, В обработке: ${requestCount}, Всего обработано: ${totalProcessedRequests}    \r`);
    }, timeoutDuration);  // Сбрасываем лимит каждые 1000 миллисекунд
};

// Асинхронная функция для обработки запросов из очереди
const processQueue = async () => {
    let requestsToProcess = Math.min(requestLimit, requestQueue.length);

    for (let i = 0; i < requestsToProcess; i++) {
        if (requestQueue.length > 0 && requestCount < requestLimit) {
            const { handler, args } = requestQueue.shift(); // Извлекаем первый запрос из очереди
            try {
                await handler(...args); // Асинхронно вызываем обработчик с аргументами
            } catch (error) {
                if (error.response && error.response.body && error.response.body.error_code === 429) {
                    const retryAfter = error.response.body.parameters.retry_after;
                    console.error(`Превышен лимит запросов. Пауза на ${retryAfter} секунд.`);
                    isRateLimited = true; // Включаем ограничение

                    // Устанавливаем таймаут для снятия ограничения
                    setTimeout(() => {
                        isRateLimited = false;
                        console.log('Ограничение снято, продолжаем обработку запросов.');
                    }, retryAfter * 1000);

                    break; // Останавливаем дальнейшую обработку, чтобы пауза начала действовать
                } else {
                    console.error(`Ошибка при обработке запроса: ${error}`);
                }
            }
            requestCount++; // Увеличиваем счетчик запросов
            totalProcessedRequests++; // Увеличиваем общее количество обработанных запросов
        }
    }
};

// Функция для контроля запросов
const requestControl = (handler, ...args) => {
    // Все запросы добавляем в очередь
    requestQueue.push({ handler, args });
};

// Экспорт функций
module.exports = {
    requestControl,
    startProcessingQueue
};

