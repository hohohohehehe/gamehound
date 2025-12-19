
const API_BASE = 'http://localhost:3000/api';

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    isLoggedIn() {
        return !!this.token;
    }

    login(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

const auth = new AuthManager();

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('account.html') && !auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    initAuthForms();
    initDashboard();
    initMap();
    initTaskBoard();
});

function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (response.ok) {
            auth.login(result.token, result.user);
            showMessage('Успешный вход!', 'success');
            setTimeout(() => window.location.href = 'account.html', 1000);
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        showMessage('Ошибка сети', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (response.ok) {
            auth.login(result.token, result.user);
            showMessage('Регистрация успешна!', 'success');
            setTimeout(() => window.location.href = 'account.html', 1000);
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        showMessage('Ошибка сети', 'error');
    }
}

async function initDashboard() {
    if (!document.getElementById('dashboard')) return;

    await loadProjects();
    
    initCharts();
    
    initFilters();
    
    document.getElementById('logout-btn').addEventListener('click', () => auth.logout());
}

async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE}/projects`, {
            headers: auth.getAuthHeaders()
        });
        
        const projects = await response.json();
        renderProjectsTable(projects);
        updateCharts(projects);
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
    }
}

function renderProjectsTable(projects) {
    const tbody = document.getElementById('projectsList');
    tbody.innerHTML = '';

    projects.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.title}</td>
            <td><span class="status-badge ${project.status}">${getStatusText(project.status)}</span></td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress}%"></div>
                    <span class="progress-text">${project.progress}%</span>
                </div>
            </td>
            <td>${new Date(project.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn-edit" onclick="editProject(${project.id})">✏️</button>
                <button class="btn-delete" onclick="deleteProject(${project.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Активный',
        'completed': 'Завершен',
        'planned': 'Запланирован'
    };
    return statusMap[status] || status;
}

function initCharts() {
    const projectsCtx = document.getElementById('projectsChart');
    const timeCtx = document.getElementById('timeChart');

    window.projectsChart = new Chart(projectsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Активные', 'Завершенные', 'Запланированные'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#4fc3f7', '#4caf50', '#ff9800']
            }]
        }
    });

    window.timeChart = new Chart(timeCtx, {
        type: 'bar',
        data: {
            labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
            datasets: [{
                label: 'Часы разработки',
                data: [120, 150, 180, 90, 200, 170],
                backgroundColor: '#ff5722'
            }]
        }
    });
}

function updateCharts(projects) {
    const statusCount = {
        active: 0,
        completed: 0,
        planned: 0
    };

    projects.forEach(project => {
        statusCount[project.status] = (statusCount[project.status] || 0) + 1;
    });

    window.projectsChart.data.datasets[0].data = [
        statusCount.active,
        statusCount.completed,
        statusCount.planned
    ];
    window.projectsChart.update();
}

function initFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortBtn = document.getElementById('sortBtn');

    let isAscending = true;

    searchInput?.addEventListener('input', filterProjects);
    statusFilter?.addEventListener('change', filterProjects);
    sortBtn?.addEventListener('click', () => {
        isAscending = !isAscending;
        sortProjects(isAscending);
    });
}

function filterProjects() {
    console.log('Фильтрация проектов...');
}

function sortProjects(ascending) {
    console.log('Сортировка проектов...');
}


function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const contactsMap = L.map('map').setView([55.7558, 37.6173], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(contactsMap);

    const offices = [
        {
            coords: [55.7558, 37.6173],
            title: "Главный офис",
            address: "Москва, ул. Разработчиков, 15"
        },
        {
            coords: [55.7517, 37.6178],
            title: "Студия дизайна", 
            address: "Москва, ул. Креативная, 8"
        },
        {
            coords: [55.7597, 37.6192],
            title: "Технический отдел",
            address: "Москва, пр. Инноваций, 25"
        }
    ];

    offices.forEach(office => {
        const marker = L.marker(office.coords).addTo(contactsMap);
        marker.bindPopup(`
            <strong>${office.title}</strong><br>
            ${office.address}
        `);
    });

    const accountMapElement = document.getElementById('map');
    if (accountMapElement && accountMapElement.parentElement.classList.contains('map-section')) {
        const accountMap = L.map('map').setView([55.7558, 37.6173], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(accountMap);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userCoords = [position.coords.latitude, position.coords.longitude];
                L.marker(userCoords)
                    .addTo(accountMap)
                    .bindPopup('Ваше местоположение')
                    .openPopup();
                
                accountMap.setView(userCoords, 13);
            });
        }
    }
}

function initTaskBoard() {
    const tasks = document.querySelectorAll('.task');
    const columns = document.querySelectorAll('.column');

    tasks.forEach(task => {
        task.addEventListener('dragstart', handleDragStart);
        task.addEventListener('dragend', handleDragEnd);
    });

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.textContent);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const taskText = e.dataTransfer.getData('text/plain');
    const draggingTask = document.querySelector('.task.dragging');
    
    if (draggingTask) {
        e.target.appendChild(draggingTask);
        showMessage(`Задача перемещена в "${e.target.querySelector('h3').textContent}"`, 'success');
    }
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        setTimeout(() => messageEl.textContent = '', 3000);
    }
}

async function editProject(id) {
    const newTitle = prompt('Введите новое название проекта:');
    if (newTitle) {
        try {
            const response = await fetch(`${API_BASE}/projects/${id}`, {
                method: 'PUT',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({ title: newTitle })
            });
            
            if (response.ok) {
                loadProjects();
                showMessage('Проект обновлен', 'success');
            }
        } catch (error) {
            showMessage('Ошибка обновления', 'error');
        }
    }
}

async function deleteProject(id) {
    if (confirm('Вы уверены, что хотите удалить проект?')) {
        try {
            const response = await fetch(`${API_BASE}/projects/${id}`, {
                method: 'DELETE',
                headers: auth.getAuthHeaders()
            });
            
            if (response.ok) {
                loadProjects();
                showMessage('Проект удален', 'success');
            }
        } catch (error) {
            showMessage('Ошибка удаления', 'error');
        }
    }
}

// ===== ФУНКЦИИ ДЛЯ СТРАНИЦ ПРОЕКТОВ =====

// Инициализация страницы проекта
function initProjectPage() {
    if (!document.querySelector('.project-hero')) return;
    
    initProjectRating();
    initScreenshotGallery();
    initReviewForm();
}

// Оценка звездочками
function initProjectRating() {
    const stars = document.querySelectorAll('.star');
    if (!stars.length) return;
    
    let currentRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            currentRating = rating;
            
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            
            // Сохраняем оценку в форме
            document.querySelector('.review-form')?.setAttribute('data-rating', rating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.style.color = '#ffd700';
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            stars.forEach((s, index) => {
                if (index >= currentRating) {
                    s.style.color = '#555';
                }
            });
        });
    });
}

// Галерея скриншотов
function initScreenshotGallery() {
    const screenshots = document.querySelectorAll('.screenshot-item img');
    screenshots.forEach(img => {
        img.addEventListener('click', function() {
            openLightbox(this.src);
        });
    });
}

function openLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <span class="close-lightbox">&times;</span>
            <img src="${src}" alt="Увеличенный скриншот">
        </div>
    `;
    
    document.body.appendChild(lightbox);
    
    lightbox.querySelector('.close-lightbox').addEventListener('click', () => {
        document.body.removeChild(lightbox);
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            document.body.removeChild(lightbox);
        }
    });
}

// Форма отзыва
function initReviewForm() {
    const reviewForm = document.querySelector('.review-form');
    if (!reviewForm) return;
    
    reviewForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const rating = this.getAttribute('data-rating') || 0;
        const text = this.querySelector('textarea').value;
        
        if (text.trim() === '') {
            showMessage('Пожалуйста, напишите отзыв', 'error');
            return;
        }
        
        if (rating === 0) {
            showMessage('Пожалуйста, поставьте оценку', 'error');
            return;
        }
        
        // Симуляция отправки отзыва
        const reviewData = {
            rating: rating,
            text: text,
            date: new Date().toLocaleDateString(),
            user: auth.user?.name || 'Анонимный пользователь'
        };
        
        addReviewToPage(reviewData);
        
        showMessage('Спасибо за ваш отзыв!', 'success');
        this.reset();
        document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
    });
}

function addReviewToPage(review) {
    const reviewsContainer = document.querySelector('.reviews-container');
    if (!reviewsContainer) return;
    
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card fade-in';
    
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    reviewCard.innerHTML = `
        <div class="review-header">
            <div class="reviewer">
                <span class="reviewer-name">${review.user}</span>
                <div class="review-rating">${stars}</div>
            </div>
            <span class="review-date">${review.date}</span>
        </div>
        <div class="review-content">
            <p>${review.text}</p>
        </div>
    `;
    
    reviewsContainer.insertBefore(reviewCard, reviewsContainer.firstChild);
    
    // Анимация появления
    setTimeout(() => {
        reviewCard.style.opacity = '1';
        reviewCard.style.transform = 'translateY(0)';
    }, 100);
}

// Загрузка данных проекта
async function loadProjectData(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
            headers: auth.getAuthHeaders()
        });
        
        if (response.ok) {
            const project = await response.json();
            updateProjectPage(project);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных проекта:', error);
    }
}

function updateProjectPage(project) {
    // Обновляем заголовок страницы
    document.title = `${project.title} - GAMEHOUND`;
    
    // Обновляем основную информацию
    const titleElement = document.querySelector('.project-title');
    if (titleElement) titleElement.textContent = project.title;
    
    // Обновляем описание и другую информацию
    // ... (добавьте обновление остальных элементов)
}

// Переход на страницу проекта
function navigateToProject(projectId) {
    // Временное решение - создаем URL на основе ID проекта
    const projectSlug = projectId.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `project-${projectSlug}.html`;
}

// ===== ИНИЦИАЛИЗАЦИЯ СТРАНИЦ ПРОЕКТОВ =====
function initProjectsNavigation() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        // Получаем название проекта из карточки
        const projectTitle = card.querySelector('h3').textContent;
        const projectId = projectTitle.toLowerCase().replace(/\s+/g, '-');
        
        card.addEventListener('click', function(e) {
            // Проверяем, не кликнули ли на кнопку или другой интерактивный элемент
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            
            // Переходим на страницу проекта
            navigateToProject(projectId);
        });
    });
}

// ===== ОБНОВЛЯЕМ ОСНОВНУЮ ИНИЦИАЛИЗАЦИЮ =====
document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    if (window.location.pathname.includes('account.html') && !auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Инициализация компонентов
    initAuthForms();
    initDashboard();
    initMap();
    initTaskBoard();
    initProjectsNavigation(); // Добавляем навигацию по проектам
    initProjectPage(); // Инициализация страницы проекта
});

// ===== ДОБАВЛЯЕМ СТИЛИ ДЛЯ ЛАЙТБОКСА =====
const lightboxStyles = `
.lightbox {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.lightbox-content {
    position: relative;
    max-width: 90%;
    max-height: 90%;
}

.lightbox-content img {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 8px;
    border: 2px solid #4fc3f7;
}

.close-lightbox {
    position: absolute;
    top: -40px;
    right: 0;
    color: white;
    font-size: 30px;
    cursor: pointer;
    background: rgba(255, 87, 34, 0.8);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.close-lightbox:hover {
    background: #ff5722;
}
`;

// Добавляем стили лайтбокса в DOM
if (!document.querySelector('#lightbox-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'lightbox-styles';
    styleSheet.textContent = lightboxStyles;
    document.head.appendChild(styleSheet);
}