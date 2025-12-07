
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