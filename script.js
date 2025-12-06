
const API_URL = 'http://localhost:3000/api';

// Глобальное состояние приложения
const AppState = {
    currentUser: JSON.parse(localStorage.getItem('current_user')) || null,
    workouts: [],
    completedWorkouts: []
};

// Вспомогательные функции для уведомлений
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldAlerts = document.querySelectorAll('.custom-alert');
    oldAlerts.forEach(alert => alert.remove());
    
    // Создаем новое уведомление
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    `;
    
    const icon = type === 'success' ? '✓' : type === 'danger' ? '✗' : 'ℹ';
    alertDiv.innerHTML = `
        <strong>${icon} ${message}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
   
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


async function fetchWorkouts(filters = {}) {
    try {
        const response = await fetch(`${API_URL}/workouts`);
        if (!response.ok) throw new Error('Failed to fetch workouts');
        
        let workouts = await response.json();
        
        // Применяем фильтры
        if (filters.type && filters.type !== 'all') {
            workouts = workouts.filter(w => w.type === filters.type);
        }
        
        if (filters.level && filters.level !== 'all') {
            workouts = workouts.filter(w => w.level === filters.level);
        }
        
        AppState.workouts = workouts;
        return workouts;
    } catch (error) {
        console.error('Error fetching workouts:', error);
        showNotification('Failed to load workouts', 'danger');
        return [];
    }
}

// Регистрация пользователя
async function handleRegistration() {
    const firstName = document.getElementById('firstNameInput')?.value.trim();
    const lastName = document.getElementById('lastNameInput')?.value.trim();
    const email = document.getElementById('emailInput')?.value.trim();
    const password = document.getElementById('passwordInput')?.value.trim();

    if (!firstName || !lastName || !email || !password) {
        return showNotification('Fill out all fields!', 'danger');
    }

    if (!isValidEmail(email)) {
        return showNotification('Please enter a valid email address!', 'danger');
    }

    if (password.length < 6) {
        return showNotification('Password must be at least 6 characters long!', 'danger');
    }

    try {
        // Проверяем, не зарегистрирован ли уже пользователь
        const checkResponse = await fetch(`${API_URL}/users?email=${encodeURIComponent(email)}`);
        const existingUsers = await checkResponse.json();
        
        if (existingUsers.length > 0) {
            return showNotification('User with this email already exists!', 'danger');
        }

        // Регистрируем нового пользователя
        const registerResponse = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                password
            })
        });

        if (!registerResponse.ok) {
            throw new Error('Failed to register user');
        }

        const createdUser = await registerResponse.json();
        
        // Автоматически входим
        AppState.currentUser = createdUser;
        localStorage.setItem('current_user', JSON.stringify(createdUser));
        updateAuthUI();
        
        showNotification('Registration successful!', 'success');
        
        // Закрываем модальное окно если оно есть
        const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (modal) modal.hide();
        
        // Перенаправляем на профиль
        setTimeout(() => {
            window.location.href = 'pages/profile.html';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'danger');
    }
}

// Вход пользователя
async function handleLogin() {
    const email = document.getElementById('loginEmailInput')?.value.trim();
    const password = document.getElementById('loginPasswordInput')?.value.trim();

    if (!email || !password) {
        return showNotification('Enter your credentials!', 'danger');
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const user = await response.json();
        
        // Сохраняем пользователя
        AppState.currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
        updateAuthUI();
        
        showNotification('Login successful!', 'success');
        
        // Закрываем модальное окно если оно есть
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (modal) modal.hide();
        
        // Перенаправляем на профиль
        setTimeout(() => {
            window.location.href = 'pages/profile.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showNotification('Invalid email or password', 'danger');
    }
}

// Выход
function handleLogout() {
    AppState.currentUser = null;
    localStorage.removeItem('current_user');
    updateAuthUI();
    showNotification('Logged out successfully!', 'success');
    
    if (window.location.pathname.includes('profile.html')) {
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }
}

// Получение выполненных тренировок
async function fetchCompletedWorkouts() {
    try {
        // Для всех пользователей используем localStorage
        const completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts')) || [];
        AppState.completedWorkouts = completedWorkouts;
        return completedWorkouts;
    } catch (error) {
        console.error('Error fetching completed workouts:', error);
        return [];
    }
}

// Отметка тренировки как выполненной
async function markWorkoutCompleted(workoutId, workoutName = '', workoutLevel = 'intermediate') {
    try {
        const completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts')) || [];
        
        // Проверяем, не была ли уже отмечена эта тренировка
        const alreadyCompleted = completedWorkouts.find(item => item.id === workoutId);
        
        if (!alreadyCompleted) {
            // Добавляем тренировку
            completedWorkouts.push({
                id: workoutId,
                name: workoutName,
                level: workoutLevel,
                date: new Date().toISOString(),
                completedDate: new Date().toISOString()
            });
            
            // Сохраняем в localStorage
            localStorage.setItem('completedWorkouts', JSON.stringify(completedWorkouts));
            AppState.completedWorkouts = completedWorkouts;
            
            showNotification('Workout marked as completed!', 'success');
            return true;
        } else {
            showNotification('You have already completed this workout!', 'info');
            return false;
        }
    } catch (error) {
        console.error('Error marking workout as completed:', error);
        showNotification('Failed to mark workout as completed', 'danger');
        return false;
    }
}

// Обновление UI в зависимости от авторизации
function updateAuthUI() {
    // Обновляем навигацию
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navRegisterBtn = document.getElementById('navRegisterBtn');
    const navProfileBtn = document.getElementById('navProfileBtn');
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    const mainRegisterBtn = document.getElementById('mainRegisterBtn');
    
    if (AppState.currentUser) {
        // Пользователь авторизован
        if (navLoginBtn) navLoginBtn.style.display = 'none';
        if (navRegisterBtn) navRegisterBtn.style.display = 'none';
        if (navProfileBtn) {
            navProfileBtn.style.display = 'inline-block';
            navProfileBtn.innerHTML = `<i class="fas fa-user"></i> ${AppState.currentUser.firstName}`;
        }
        if (navLogoutBtn) navLogoutBtn.style.display = 'inline-block';
        
        // Обновляем главную кнопку
        if (mainRegisterBtn) {
            mainRegisterBtn.innerHTML = '<i class="fas fa-dumbbell me-2"></i>Start Training';
            mainRegisterBtn.onclick = function() {
                window.location.href = 'pages/workouts.html';
            };
        }
    } else {
        // Гость
        if (navLoginBtn) navLoginBtn.style.display = 'inline-block';
        if (navRegisterBtn) navRegisterBtn.style.display = 'inline-block';
        if (navProfileBtn) {
            navProfileBtn.style.display = 'inline-block';
            navProfileBtn.innerHTML = '<i class="fas fa-user"></i> Profile';
        }
        if (navLogoutBtn) navLogoutBtn.style.display = 'none';
        
        // Обновляем главную кнопку
        if (mainRegisterBtn) {
            mainRegisterBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Get Started - Register Now';
            mainRegisterBtn.onclick = function() {
                const modal = new bootstrap.Modal(document.getElementById('registerModal'));
                modal.show();
            };
        }
    }
}


function initModals() {
    // Регистрация обработчиков для кнопок в навигации
    const loginBtn = document.getElementById('navLoginBtn');
    const registerBtn = document.getElementById('navRegisterBtn');
    const profileBtn = document.getElementById('navProfileBtn');
    const logoutBtn = document.getElementById('navLogoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('loginModal'));
            modal.show();
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('registerModal'));
            modal.show();
        });
    }
    
    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            if (!AppState.currentUser) {
                e.preventDefault();
                const modal = new bootstrap.Modal(document.getElementById('loginModal'));
                modal.show();
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}


async function loadAllWorkouts() {
    try {
        const workouts = await fetchWorkouts();
        await fetchCompletedWorkouts();
        return workouts;
    } catch (error) {
        console.error('Error loading workouts:', error);
        return [];
    }
}

// Отображение тренировок на странице workouts.html
function displayWorkouts(workouts, containerId = 'workoutContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (workouts.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">No workouts found</div></div>';
        return;
    }
    
    workouts.forEach(workout => {
        const isCompleted = AppState.completedWorkouts.some(cw => cw.id === workout.id);
        
        const workoutCard = document.createElement('div');
        workoutCard.className = 'col-md-4 mb-4';
        workoutCard.innerHTML = `
            <div class="card glass-card h-100">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${workout.name}</h5>
                    <p class="card-text flex-grow-1">${workout.description}</p>
                    <div class="mb-2">
                        <span class="badge bg-light-blue">${workout.type}</span>
                        <span class="badge bg-info">${workout.level}</span>
                        <span class="badge bg-secondary">${workout.duration}</span>
                    </div>
                    <div class="workout-info mb-2">
                        <p class="mb-1"><strong>Calories:</strong> ${workout.calories}</p>
                        <p class="mb-3"><strong>Equipment:</strong> ${workout.equipment}</p>
                    </div>
                    ${isCompleted ? 
                        '<span class="badge bg-success mb-3">✓ Completed</span>' : 
                        `<button class="btn btn-outline-success btn-sm mb-3 mark-workout-btn" data-id="${workout.id}" data-name="${workout.name}" data-level="${workout.level}">
                            Mark as Completed
                        </button>`
                    }
                    <a href="workout-details.html?id=${workout.id}" class="btn btn-form-primary mt-auto">View Details</a>
                </div>
            </div>
        `;
        container.appendChild(workoutCard);
    });
    
    // Добавляем обработчики для кнопок отметки
    document.querySelectorAll('.mark-workout-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const workoutId = this.getAttribute('data-id');
            const workoutName = this.getAttribute('data-name');
            const workoutLevel = this.getAttribute('data-level');
            
            const success = await markWorkoutCompleted(workoutId, workoutName, workoutLevel);
            if (success) {
                this.outerHTML = '<span class="badge bg-success mb-3">✓ Completed</span>';
                
                // Обновляем прогресс если на странице профиля
                if (window.location.pathname.includes('profile.html')) {
                    loadProfile();
                }
            }
        });
    });
}

// Фильтрация тренировок
function filterWorkouts(workouts, filters) {
    let filtered = workouts;
    
    if (filters.level && filters.level !== 'all') {
        filtered = filtered.filter(w => w.level === filters.level);
    }
    
    if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(w => w.type === filters.type);
    }
    
    if (filters.duration && filters.duration !== 'all') {
        filtered = filtered.filter(w => w.duration === filters.duration);
    }
    
    return filtered;
}


async function loadProfile() {
    try {
        await fetchWorkouts();
        await fetchCompletedWorkouts();
        
        // Обновляем информацию о пользователе
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        
        if (AppState.currentUser) {
            if (userNameElement) {
                userNameElement.textContent = `${AppState.currentUser.firstName} ${AppState.currentUser.lastName}`;
            }
            if (userEmailElement) {
                userEmailElement.textContent = AppState.currentUser.email;
            }
        } else {
            if (userNameElement) userNameElement.textContent = 'Guest User';
            if (userEmailElement) userEmailElement.textContent = 'Not logged in';
        }
        
        updateProfileProgress();
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Обновление прогресса в профиле
function updateProfileProgress() {
    const completedCount = AppState.completedWorkouts.length;
    
    // Обновляем элементы статистики
    const completedElement = document.getElementById('completedWorkoutsCount');
    const progressElement = document.getElementById('progressPercentage');
    const progressBar = document.getElementById('progressBar');
    
    if (completedElement) completedElement.textContent = completedCount;
    
    // Рассчитываем процент прогресса (предполагаем цель 10 тренировок)
    const goal = 10;
    const progressPercentage = Math.min(100, Math.round((completedCount / goal) * 100));
    
    if (progressElement) progressElement.textContent = `${progressPercentage}%`;
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage);
    }
    
    // Отображаем список выполненных тренировок
    displayCompletedWorkoutsList();
}

// Отображение списка выполненных тренировок
function displayCompletedWorkoutsList() {
    const container = document.getElementById('completedWorkoutsList');
    if (!container) return;
    
    if (AppState.completedWorkouts.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <p class="text-muted">No completed workouts yet.</p>
                <p>Complete workouts to see them here!</p>
                <a href="workouts.html" class="btn btn-sm btn-form-primary">Browse Workouts</a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    
    // Сортируем по дате (новые сверху)
    const sortedWorkouts = [...AppState.completedWorkouts].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedWorkouts.forEach(item => {
        const date = new Date(item.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
     
        let levelBadgeClass = 'bg-secondary';
        if (item.level === 'beginner') levelBadgeClass = 'bg-success';
        if (item.level === 'intermediate') levelBadgeClass = 'bg-warning';
        if (item.level === 'advanced') levelBadgeClass = 'bg-danger';
        
        html += `
            <div class="list-group-item border-0 mb-2 p-3" style="background: rgba(79, 134, 247, 0.05);">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${item.name || 'Completed Workout'}</h6>
                        <div class="d-flex align-items-center">
                            <span class="badge ${levelBadgeClass} me-2">${item.level || 'intermediate'}</span>
                            <small class="text-muted">
                                <i class="far fa-calendar me-1"></i>${formattedDate} at ${formattedTime}
                            </small>
                        </div>
                    </div>
                    <div class="text-end ms-3">
                        <span class="badge bg-success">
                            <i class="fas fa-check-circle me-1"></i>Completed
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}


// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized, current user:', AppState.currentUser);
    
    // Обновляем UI авторизации
    updateAuthUI();
    
    // Определяем текущую страницу и загружаем соответствующие данные
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/') {
        // Главная страница
        initModals();
        
    } else if (path.includes('workouts.html')) {
        // Страница всех тренировок
        initWorkoutsPage();
        
    } else if (path.includes('profile.html')) {
        // Страница профиля
        loadProfile();
        
    } else if (path.includes('workout-details.html')) {
        // Страница деталей тренировки
        // Здесь загружается отдельный скрипт на странице
    }
});

// Инициализация страницы тренировок
async function initWorkoutsPage() {
    try {
        const workouts = await loadAllWorkouts();
        displayWorkouts(workouts);
        
        // Инициализируем фильтры если они есть
        const levelFilter = document.getElementById('levelFilter');
        const typeFilter = document.getElementById('typeFilter');
        const durationFilter = document.getElementById('durationFilter');
        const applyBtn = document.getElementById('applyFilters');
        const resetBtn = document.getElementById('resetFilters');
        
        if (applyBtn && levelFilter && typeFilter) {
            applyBtn.addEventListener('click', async () => {
                const filters = {
                    level: levelFilter.value || 'all',
                    type: typeFilter.value || 'all',
                    duration: durationFilter ? durationFilter.value : 'all'
                };
                
                const filtered = filterWorkouts(workouts, filters);
                displayWorkouts(filtered);
            });
        }
        
        if (resetBtn && levelFilter && typeFilter) {
            resetBtn.addEventListener('click', () => {
                if (levelFilter) levelFilter.value = 'all';
                if (typeFilter) typeFilter.value = 'all';
                if (durationFilter) durationFilter.value = 'all';
                displayWorkouts(workouts);
            });
        }
        
    } catch (error) {
        console.error('Error initializing workouts page:', error);
        showNotification('Failed to load workouts', 'danger');
    }
    
}


window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.markWorkoutCompleted = markWorkoutCompleted;
window.updateAuthUI = updateAuthUI;
window.loadProfile = loadProfile;