Telegram.WebApp.ready();
window.Telegram.WebApp.expand();
window.Telegram.WebApp.disableVerticalSwipes();

// Данные пользователя, authDate и hash, которые Telegram Web App предоставляет
const userId = Telegram.WebApp.initDataUnsafe.user.id;
const firstName = Telegram.WebApp.initDataUnsafe.user.first_name || 'User';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pixelSizeInput = document.getElementById('pixel-size');
const pixelSizeValue = document.getElementById('pixel-size-value');
let imageLoaded = false;
let img = new Image();

// Изначально canvas круглый
canvas.style.borderRadius = '50%';

// Отключаем прокрутку на touch-событиях (тачскрин) только для канваса
function preventDefaultTouch(event) {
    event.preventDefault();
}

// Отключаем прокрутку только для канваса
canvas.addEventListener('touchstart', preventDefaultTouch, { passive: false });
canvas.addEventListener('touchmove', preventDefaultTouch, { passive: false });

// Принудительно возвращаем скролл на позицию 0
document.addEventListener('scroll', function() {
    window.scrollTo(0, 0); // Принудительно возвращаем скролл на позицию 0
}, { passive: false });

// Функция для сохранения фото профиля в локальное хранилище
function savePhotoToLocal(photoBlob) {
    const reader = new FileReader();
    reader.onloadend = function() {
        localStorage.setItem('profilePhoto', reader.result); // Сохраняем фото как base64
    };
    reader.readAsDataURL(photoBlob); // Преобразуем Blob в base64
}

// Функция для загрузки фото из локального хранилища
function loadPhotoFromLocal() {
    const photoBase64 = localStorage.getItem('profilePhoto');
    if (photoBase64) {
        img.src = photoBase64;
        img.onload = () => {
            canvas.style.borderRadius = '50%';
            drawImageToCanvas(img);
            pixelateWithGrid();
        };
    } else {
        console.error('Фото профиля не найдено в локальном хранилище');
    }
}

// Функция для сохранения фото профиля на сервер при заходе
async function saveProfilePhoto() {
    try {
        const response = await fetch(`/sendProfilePhoto?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
            console.log('Фото профиля успешно сохранено на сервере:', data.filePath);
            return true;
        } else {
            console.error('Ошибка при сохранении фото профиля:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Ошибка при запросе сохранения фото профиля:', error);
        return false;
    }
}

// Асинхронная функция загрузки изображения профиля с сервера
async function loadImage() {
    try {
        // Запрашиваем изображение профиля
        const response = await fetch(`/showProfilePhoto?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Ошибка при получении фото профиля');
        }

        // Получаем Blob-данные и сохраняем в локальное хранилище
        const blob = await response.blob();
        savePhotoToLocal(blob); // Сохраняем в локальное хранилище

        const url = URL.createObjectURL(blob);

        // Ожидаем загрузку изображения
        await new Promise((resolve) => {
            img.src = url;
            img.onload = () => {
                canvas.style.borderRadius = '50%';
                resolve(); // Сообщаем, что загрузка завершена
            };
        });

        // Отрисовываем изображение и сразу пикселизируем
        drawImageToCanvas(img);
        pixelateWithGrid(); // Пикселизация сразу после отрисовки

    } catch (error) {
        console.error('Ошибка при получении фото профиля:', error);
        document.getElementById('profile-photo').innerText = 'Произошла ошибка при получении фото профиля.';
    }
}

// Функция для работы с заходами и счетчиком
async function handleProfilePhoto() {
    // Получаем текущее количество заходов из localStorage или инициализируем его
    let visitCount = localStorage.getItem('visitCount');

    // Если счетчика нет, это первый заход: загружаем фото с сервера и устанавливаем счетчик
    if (!visitCount) {
        console.log('Первый заход, загружаем фото с сервера...');
        const isProfilePhotoSaved = await saveProfilePhoto(); // Сохраняем фото профиля на сервер
        if (isProfilePhotoSaved) {
            await loadImage(); // Загружаем фото профиля с сервера
        }
        localStorage.setItem('visitCount', 1); // Устанавливаем счетчик на 1 после первого захода
    } else {
        visitCount = parseInt(visitCount, 10);

        // Если это 20-й заход, обновляем фото с сервера
        if (visitCount >= 20) {
            console.log('20-й заход, обновляем фото...');
            const isProfilePhotoSaved = await saveProfilePhoto(); // Сохраняем фото профиля на сервер
            if (isProfilePhotoSaved) {
                await loadImage(); // Загружаем фото профиля с сервера
            }
            localStorage.setItem('visitCount', 1); // Сбрасываем счетчик после обновления
        } else {
            // Если не 20-й заход, загружаем фото из локального хранилища
            console.log(`Заход номер: ${visitCount + 1}`);
            loadPhotoFromLocal();
            localStorage.setItem('visitCount', visitCount + 1); // Увеличиваем счетчик
        }
    }
}

// Главная функция: запускаем обработку
(async function() {
    await handleProfilePhoto(); // Запускаем обработку загрузки фото и работу с счетчиком
})();




// Функция отрисовки изображения на Canvas
function drawImageToCanvas(image) {
    // Очищаем канвас перед отрисовкой
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рассчитываем соотношение сторон изображения
    const imageRatio = image.width / image.height;

    // Рассчитываем доступную ширину и высоту для канваса
    const maxWidth = window.innerWidth - 40; // Оставляем по 20px отступов с каждой стороны
    const maxHeight = window.innerHeight * 0.8; // Максимальная высота 80% окна

    let canvasWidth, canvasHeight;
    
    if (imageRatio > 1) {
        // Если изображение горизонтальное
        canvasWidth = Math.min(maxWidth, image.width);
        canvasHeight = canvasWidth / imageRatio;
    } else {
        // Если изображение вертикальное или квадратное
        canvasHeight = Math.min(maxHeight, image.height);
        canvasWidth = canvasHeight * imageRatio;
    }

    // Устанавливаем размеры канваса
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Отрисовываем изображение на Canvas
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    imageLoaded = true;
}


// Функция для нахождения насыщенности цвета
function getSaturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min;
}

// Функция обработки пикселизации изображения с контурированием
function pixelateWithGrid() {
    if (!imageLoaded) return;

    const pixelSize = parseInt(pixelSizeInput.value, 10);
    
    // Получаем изображение
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Контурирование - обнаружение границ и их выделение
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];

            // Сравниваем с соседними пикселями
            if (x < canvas.width - 1 && y < canvas.height - 1) {
                const neighborIndex = ((y + 1) * canvas.width + (x + 1)) * 4;
                const neighborR = data[neighborIndex];
                const neighborG = data[neighborIndex + 1];
                const neighborB = data[neighborIndex + 2];

                // Определяем насыщенность текущего пикселя и соседнего
                const currentSaturation = getSaturation(r, g, b);
                const neighborSaturation = getSaturation(neighborR, neighborG, neighborB);

                // Если насыщенность сильно различается, выделяем границу
                if (Math.abs(currentSaturation - neighborSaturation) > 50) {
                    const maxR = Math.max(r, neighborR);
                    const maxG = Math.max(g, neighborG);
                    const maxB = Math.max(b, neighborB);

                    // Заменяем цвет текущего пикселя на самый насыщенный соседний
                    data[index] = maxR;
                    data[index + 1] = maxG;
                    data[index + 2] = maxB;
                }
            }
        }
    }

    // Записываем обновленные данные обратно в холст
    ctx.putImageData(imageData, 0, 0);

    // Теперь выполняем пикселизацию
    for (let y = 0; y < canvas.height; y += pixelSize) {
        for (let x = 0; x < canvas.width; x += pixelSize) {
            const index = (y * canvas.width + x) * 4;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];

            // Заполняем каждый блок нужного цвета
            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
    }
}

// Обработчик изменения размера пикселя через ползунок
pixelSizeInput.addEventListener('input', () => {
    pixelSizeValue.textContent = pixelSizeInput.value;
    if (imageLoaded) {
        // Очищаем Canvas перед перерисовкой
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawImageToCanvas(img); // Перерисовываем изображение
        pixelateWithGrid(); // Применяем пикселизацию
    }
});






// Обработка загрузки собственного изображения
document.getElementById('upload-image').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            img.src = e.target.result;
            img.onload = () => {
                canvas.style.borderRadius = '0'; // Убираем круглую форму для загруженного изображения
                drawImageToCanvas(img); // Перерисовываем загруженное изображение и сразу пикселизируем
                pixelateWithGrid(); // Применяем пикселизацию сразу после загрузки
            };
        };
        reader.readAsDataURL(file);
    }
});

// Получаем initData и initDataUnsafe
const initData = Telegram.WebApp.initData;
const initDataUnsafe = Telegram.WebApp.initDataUnsafe || {};

// Функция для отправки изображения на сервер вместе с initData
async function sendImageToServer() {
    const button = document.getElementById('send-image');
    
    // Деактивируем кнопку и меняем текст перед отправкой
    button.disabled = true;
    button.textContent = 'Sending...';

    try {
        const image = canvas.toDataURL('image/jpeg'); // Преобразуем изображение в формат Base64

        // Отправляем данные авторизации и изображение на сервер
        const response = await fetch('/sendProcessedImage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `initData ${initData}` // Передаем initData без дополнительного кодирования
            },
            body: JSON.stringify({
                image: image // Отправляем только изображение
            })
        });

        const data = await response.json();

        if (data.message === "Изображение отправлено!") {
            // Изображение отправлено успешно
            setTimeout(() => {
                window.location.href = `https://t.me/Pixinotbot`; // Перенаправляем по ссылке
                Telegram.WebApp.close(); // Закрытие WebApp
            }, 1000); // Задержка перед закрытием на 1 секунду
        } else if (data.message && data.remainingTime) {
            // Ответ с ожиданием
            button.textContent = `Wait ${data.remainingTime} minutes ❤️`; // Выводим сообщение с оставшимся временем
            button.disabled = true; // Деактивируем кнопку
            
            // Включаем кнопку снова после истечения времени ожидания
            setTimeout(() => {
                button.textContent = 'Get'; // Меняем текст обратно на 'Get'
                button.disabled = false; // Делаем кнопку снова активной
            }, data.remainingTime * 60 * 1000); // Конвертируем минуты в миллисекунды
        }
    } catch (error) {
        console.error('Ошибка при отправке изображения:', error);
        button.textContent = 'Error, try again'; // В случае ошибки меняем текст кнопки
        button.disabled = false; // Включаем кнопку снова
    }
}

// Обработчик отправки изображения
document.getElementById('send-image').addEventListener('click', () => {
    sendImageToServer();
});

