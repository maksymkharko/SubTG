// Инициализация Telegram WebApp
let tg;
try {
  tg = window.Telegram.WebApp;
  console.log('Telegram WebApp initialized:', tg);
  tg.expand(); // Раскрываем на весь экран
  
  // Применяем тему Telegram
  document.documentElement.style.setProperty('--primary-color', tg.themeParams.button_color);
  document.documentElement.style.setProperty('--primary-light', tg.themeParams.link_color);
  document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color);
  document.documentElement.style.setProperty('--bg-secondary', tg.themeParams.secondary_bg_color);
  document.documentElement.style.setProperty('--text-primary', tg.themeParams.text_color);
  document.documentElement.style.setProperty('--text-secondary', tg.themeParams.hint_color);

  // Получаем информацию о пользователе
  const user = tg.initDataUnsafe.user;
  if (user) {
    // Устанавливаем имя пользователя
    const userName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    document.getElementById('user-name').textContent = userName;
    
    // Устанавливаем username если есть
    if (user.username) {
      document.getElementById('user-username').textContent = '@' + user.username;
    }
    
    // Устанавливаем аватар если есть
    if (user.photo_url) {
      document.getElementById('user-avatar').src = user.photo_url;
    } else {
      // Если фото нет, используем первую букву имени как аватар
      const avatar = document.getElementById('user-avatar');
      avatar.style.background = `var(--primary-color)`;
      avatar.style.color = 'white';
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.fontSize = '20px';
      avatar.style.fontWeight = 'bold';
      avatar.textContent = userName.charAt(0).toUpperCase();
    }
  }
} catch (e) {
  console.log('Running in local development mode');
  // Создаем мок объект для локальной разработки
  tg = {
    initDataUnsafe: { 
      user: { 
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        photo_url: ''
      } 
    },
    CloudStorage: {
      setItem: (key, value, callback) => {
        console.log('Local storage setItem:', key, value);
        localStorage.setItem(key, value);
        if (callback) callback();
      },
      getItem: (key, callback) => {
        const value = localStorage.getItem(key);
        console.log('Local storage getItem:', key, value);
        callback(null, value);
      }
    },
    showAlert: (message) => {
      console.log('Alert:', message);
      alert(message);
    },
    HapticFeedback: {
      impactOccurred: () => {}
    }
  };
}

// Состояние приложения
const state = {
  subscriptions: [],
  activeTab: 'all',
  searchQuery: '',
  settings: {
    darkMode: true,
    paymentReminders: true,
    reminderDays: 3,
    currency: 'PLN'
  }
};

// Элементы DOM
const elements = {
  serviceInput: document.getElementById('service'),
  priceInput: document.getElementById('price'),
  dateInput: document.getElementById('date'),
  subscriptionsList: document.getElementById('subscriptions-list'),
  monthlyTotalEl: document.getElementById('monthly-total'),
  yearlyTotalEl: document.getElementById('yearly-total'),
  activeCountEl: document.getElementById('active-count'),
  searchInput: document.getElementById('search'),
  addModal: document.getElementById('add-modal'),
  settingsModal: document.getElementById('settings-modal'),
  tabs: document.querySelectorAll('.tab'),
  periodOptions: document.querySelectorAll('.period-option')
};

// Проверяем, что все элементы найдены
console.log('DOM elements:', elements);

// Загружаем данные при запуске
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, loading data...');
  await loadSettings();
  await loadSubscriptions();
  setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
  // Поиск
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderSubscriptions();
  });

  // Табы
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.tab;
      renderSubscriptions();
    });
  });

  // Период подписки
  elements.periodOptions.forEach(option => {
    option.addEventListener('click', () => {
      elements.periodOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });
}

// Форматирование цены
function formatPrice(price) {
  return `${price.toFixed(2)} ${state.settings.currency}`;
}

// Форматирование даты
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Показ модального окна добавления
function showAddForm() {
  elements.addModal.classList.add('active');
  tg.HapticFeedback.impactOccurred('light');
}

// Скрытие модального окна добавления
function hideAddForm() {
  elements.addModal.classList.remove('active');
  document.getElementById('add-form').reset();
}

// Показ настроек
function showSettings() {
  elements.settingsModal.classList.add('active');
  tg.HapticFeedback.impactOccurred('light');
}

// Скрытие настроек
function hideSettings() {
  elements.settingsModal.classList.remove('active');
}

// Добавление подписки
async function addSubscription() {
  console.log('Adding subscription...');
  
  const form = document.getElementById('add-form');
  const formData = new FormData(form);
  
  const subscription = {
    service: formData.get('service').trim(),
    price: parseFloat(formData.get('price')),
    date: formData.get('date'),
    period: document.querySelector('.period-option.active').dataset.period,
    createdAt: new Date().toISOString()
  };

  console.log('New subscription:', subscription);

  // Валидация
  if (!subscription.service || isNaN(subscription.price) || !subscription.date) {
    console.log('Validation failed:', subscription);
    tg.showAlert('Пожалуйста, заполните все поля!');
    return;
  }

  if (subscription.price <= 0) {
    console.log('Invalid price:', subscription.price);
    tg.showAlert('Цена должна быть больше 0!');
    return;
  }

  try {
    state.subscriptions.push(subscription);
    await saveSubscriptions();
    hideAddForm();
    renderSubscriptions();
    tg.HapticFeedback.impactOccurred('medium');
    console.log('Subscription added successfully');
  } catch (error) {
    console.error('Error adding subscription:', error);
    tg.showAlert('Произошла ошибка при добавлении подписки');
  }
}

// Сохранение подписок
async function saveSubscriptions() {
  console.log('Saving subscriptions:', state.subscriptions);
  return new Promise((resolve, reject) => {
    try {
      tg.CloudStorage.setItem('subscriptions', JSON.stringify(state.subscriptions), (error) => {
        if (error) {
          console.error('Error saving subscriptions:', error);
          reject(error);
        } else {
          console.log('Subscriptions saved successfully');
          resolve();
        }
      });
    } catch (error) {
      console.error('Error in saveSubscriptions:', error);
      reject(error);
    }
  });
}

// Загрузка подписок
async function loadSubscriptions() {
  return new Promise((resolve, reject) => {
    try {
      tg.CloudStorage.getItem('subscriptions', (err, data) => {
        if (err) {
          console.error('Error loading subscriptions:', err);
          state.subscriptions = [];
        } else {
          state.subscriptions = JSON.parse(data || '[]');
          console.log('Loaded subscriptions:', state.subscriptions);
        }
        renderSubscriptions();
        resolve();
      });
    } catch (error) {
      console.error('Error in loadSubscriptions:', error);
      state.subscriptions = [];
      resolve();
    }
  });
}

// Загрузка настроек
async function loadSettings() {
  return new Promise((resolve) => {
    tg.CloudStorage.getItem('settings', (err, data) => {
      if (!err && data) {
        state.settings = { ...state.settings, ...JSON.parse(data) };
      }
      applySettings();
      resolve();
    });
  });
}

// Применение настроек
function applySettings() {
  // Применяем настройки к UI
  document.getElementById('dark-mode').checked = state.settings.darkMode;
  document.getElementById('payment-reminders').checked = state.settings.paymentReminders;
  document.getElementById('reminder-days').value = state.settings.reminderDays;
  document.getElementById('currency').value = state.settings.currency;
}

// Сохранение настроек
async function saveSettings() {
  return new Promise((resolve) => {
    tg.CloudStorage.setItem('settings', JSON.stringify(state.settings), resolve);
  });
}

// Фильтрация подписок
function filterSubscriptions() {
  let filtered = [...state.subscriptions];

  // Поиск
  if (state.searchQuery) {
    filtered = filtered.filter(sub => 
      sub.service.toLowerCase().includes(state.searchQuery)
    );
  }

  // Табы
  const now = new Date();
  switch (state.activeTab) {
    case 'upcoming':
      filtered = filtered.filter(sub => {
        const date = new Date(sub.date);
        return date > now && date - now <= 7 * 24 * 60 * 60 * 1000; // 7 дней
      });
      break;
    case 'expired':
      filtered = filtered.filter(sub => new Date(sub.date) < now);
      break;
  }

  return filtered;
}

// Отображение списка
function renderSubscriptions() {
  console.log('Rendering subscriptions...');
  const filtered = filterSubscriptions();
  
  elements.subscriptionsList.innerHTML = '';
  let monthlyTotal = 0;
  let activeCount = 0;

  const now = new Date();
  filtered.forEach((sub, index) => {
    const date = new Date(sub.date);
    const isActive = date > now;
    if (isActive) activeCount++;
    
    monthlyTotal += sub.price;
    
    const li = document.createElement('div');
    li.className = 'subscription-item';
    li.innerHTML = `
      <div class="subscription-info">
        <span class="subscription-name">${sub.service}</span>
        <span class="subscription-details">
          ${formatPrice(sub.price)} · ${formatDate(sub.date)}
        </span>
      </div>
      <div class="subscription-actions">
        <button class="icon-button" onclick="editSubscription(${index})">
          <span class="material-icons-round">edit</span>
        </button>
        <button class="icon-button delete" onclick="deleteSubscription(${index})">
          <span class="material-icons-round">delete</span>
        </button>
      </div>
    `;
    elements.subscriptionsList.appendChild(li);
  });

  elements.monthlyTotalEl.textContent = formatPrice(monthlyTotal);
  elements.yearlyTotalEl.textContent = formatPrice(monthlyTotal * 12);
  elements.activeCountEl.textContent = activeCount;
}

// Удаление подписки
async function deleteSubscription(index) {
  console.log('Deleting subscription at index:', index);
  try {
    state.subscriptions.splice(index, 1);
    await saveSubscriptions();
    renderSubscriptions();
    tg.HapticFeedback.impactOccurred('light');
    console.log('Subscription deleted successfully');
  } catch (error) {
    console.error('Error deleting subscription:', error);
    tg.showAlert('Произошла ошибка при удалении подписки');
  }
}

// Редактирование подписки
function editSubscription(index) {
  const subscription = state.subscriptions[index];
  // TODO: Реализовать редактирование
  console.log('Edit subscription:', subscription);
}

// Делаем функции глобальными для HTML
window.addSubscription = addSubscription;
window.deleteSubscription = deleteSubscription;
window.editSubscription = editSubscription;
window.showAddForm = showAddForm;
window.hideAddForm = hideAddForm;
window.showSettings = showSettings;
window.hideSettings = hideSettings;