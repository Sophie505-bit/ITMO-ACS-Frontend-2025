// Обновите функции handleRegistration и handleLogin для работы с JSON Server:

const handleRegistration = async () => {
    const firstName = document.getElementById('firstNameInput').value.trim();
    const lastName = document.getElementById('lastNameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!firstName || !lastName || !email || !password) {
        return showCustomAlert('Fill out all fields!', 'danger');
    }

    if (!isValidEmail(email)) {
        return showCustomAlert('Please enter a valid email address!', 'danger');
    }

    if (password.length < 6) {
        return showCustomAlert('Password must be at least 6 characters long!', 'danger');
    }

    try {
        // Проверяем, не зарегистрирован ли уже пользователь
        const response = await fetch(`${API_URL}/users?email=${email}`);
        const existingUsers = await response.json();
        
        if (existingUsers.length > 0) {
            return showCustomAlert('User with this email already exists!', 'danger');
        }

        // Создаем нового пользователя
        const newUser = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email,
            password: btoa(password),
            registrationDate: new Date().toISOString()
        };

        // Сохраняем через API
        const postResponse = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUser)
        });

        if (!postResponse.ok) {
            throw new Error('Failed to register user');
        }

        const createdUser = await postResponse.json();
        
        // Автоматически входим
        AppState.currentUser = createdUser;
        localStorage.setItem('current_user', JSON.stringify(createdUser));
        
        showCustomAlert('Registration successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        showCustomAlert('Registration failed. Please try again.', 'danger');
    }
};

const handleLogin = async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!email || !password) {
        return showCustomAlert('Enter your credentials!', 'danger');
    }

    try {
        // Ищем пользователя через API
        const response = await fetch(`${API_URL}/users?email=${email}`);
        const users = await response.json();
        
        if (users.length === 0) {
            return showCustomAlert('User not found!', 'danger');
        }

        const user = users[0];
        
        // Проверяем пароль
        if (atob(user.password) !== password) {
            return showCustomAlert('Invalid password!', 'danger');
        }

        // Убираем пароль для безопасности
        const { password: _, ...userWithoutPassword } = user;
        
        AppState.currentUser = userWithoutPassword;
        localStorage.setItem('current_user', JSON.stringify(userWithoutPassword));
        
        showCustomAlert('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showCustomAlert('Login failed. Please try again.', 'danger');
    }
};