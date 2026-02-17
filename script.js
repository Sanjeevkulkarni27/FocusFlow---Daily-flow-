// --- State Management ---
let currentUser = localStorage.getItem('focusflow_current_user') || null;
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';

// --- DOM Elements ---
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const authForm = document.getElementById('auth-form');
const tasksGrid = document.getElementById('tasks-grid');
const taskForm = document.getElementById('task-form');
const taskModal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const addTaskBtn = document.getElementById('add-task-btn');
const closeModalBtns = document.querySelectorAll('.close-modal');
const viewTitle = document.getElementById('current-view-title');
const taskSearch = document.getElementById('task-search');
const userDisplayName = document.querySelector('.user-badge span');
const userAvatar = document.querySelector('.user-avatar');

// Pomodoro State
let pomoMinutes = 25;
let pomoSeconds = 0;
let pomoInterval = null;
let isPomoRunning = false;
let pomoType = 'focus'; // focus or break

const pomoTimerEl = document.getElementById('pomo-timer');
const pomoLabelEl = document.getElementById('pomo-label');
const pomoStartBtn = document.getElementById('pomo-start');
const pomoPauseBtn = document.getElementById('pomo-pause');
const pomoResetBtn = document.getElementById('pomo-reset');

// Dashboard Elements
const totalCountEl = document.getElementById('total-tasks-count');
const completedCountEl = document.getElementById('completed-tasks-count');
const pendingCountEl = document.getElementById('pending-tasks-count');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentEl = document.getElementById('progress-percent');

// --- Quotes ---
const quotes = [
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
    { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
    { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
    { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" }
];

function setRandomQuote() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const quoteTextEl = document.querySelector('.quote-text');
    const quoteAuthorEl = document.querySelector('.quote-author');
    if (quoteTextEl) quoteTextEl.textContent = `"${quote.text}"`;
    if (quoteAuthorEl) quoteAuthorEl.textContent = `— ${quote.author}`;
}

// --- Auth Logic ---
function initAuth() {
    if (currentUser) {
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    authScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
}

function showApp() {
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

    // Load specific tasks for this user
    const savedTasks = localStorage.getItem(`focusflow_tasks_${currentUser}`);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];

    // Update user info
    if (userDisplayName) userDisplayName.textContent = `Welcome, ${currentUser}`;
    if (userAvatar) userAvatar.textContent = currentUser.substring(0, 2).toUpperCase();

    updateUI();
    setRandomQuote();
    setCurrentDate();
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        if (username) {
            currentUser = username;
            localStorage.setItem('focusflow_current_user', currentUser);
            showApp();
        }
    });
}

// Logout functional requirement
function logout() {
    localStorage.removeItem('focusflow_current_user');
    currentUser = null;
    showAuth();
}

// Update the UI every second for the countdowns
setInterval(() => {
    if (currentUser && tasks.some(t => t.dueDate && !t.completed)) {
        renderTasks();
    }
}, 1000);

// --- UI Updates ---
function updateUI() {
    renderTasks();
    updateStats();
    saveToLocalStorage();
}

function renderTasks() {
    let filteredTasks = tasks;

    // Apply Priority Filter
    if (currentFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === currentFilter);
    }

    // Apply Search Filter
    if (searchQuery) {
        filteredTasks = filteredTasks.filter(t =>
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Sort: Pending first, then by date
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    if (tasksGrid) {
        tasksGrid.innerHTML = '';
        if (filteredTasks.length === 0) {
            tasksGrid.classList.add('hidden');
        } else {
            tasksGrid.classList.remove('hidden');
            filteredTasks.forEach(task => {
                const taskCard = createTaskCard(task);
                tasksGrid.appendChild(taskCard);
            });
        }
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

function getTimeRemaining(dueDateStr) {
    const now = new Date();
    const [year, month, day] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    const diff = dueDate - now;
    if (diff <= 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s left`;
    return `${hours}h ${minutes}m ${seconds}s left`;
}

function createTaskCard(task) {
    const div = document.createElement('div');
    div.className = `task-card ${task.completed ? 'completed' : ''}`;
    div.dataset.id = task.id;

    const dateFormatted = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
    const timeLeft = task.dueDate && !task.completed ? getTimeRemaining(task.dueDate) : null;

    div.innerHTML = `
        <div class="task-checkbox" onclick="toggleTask('${task.id}')"></div>
        <div class="task-info">
            <div class="task-title-row">
                <div class="task-title">${task.title}</div>
                ${timeLeft ? `<span class="time-left-badge"><i data-lucide="clock"></i> ${timeLeft}</span>` : ''}
            </div>
            <div class="task-desc">${task.description}</div>
            <div class="task-meta">
                <span class="tag ${task.priority.toLowerCase()}">${task.priority}</span>
                <span class="task-due"><i data-lucide="calendar" style="width:12px"></i> ${dateFormatted}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="action-btn edit" onclick="openEditModal('${task.id}')">
                <i data-lucide="edit-3"></i>
            </button>
            <button class="action-btn delete" onclick="deleteTask('${task.id}')">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `;
    return div;
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (totalCountEl) totalCountEl.textContent = total;
    if (completedCountEl) completedCountEl.textContent = completed;
    if (pendingCountEl) pendingCountEl.textContent = pending;
    if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    if (progressPercentEl) progressPercentEl.textContent = `${percent}%`;
}

// --- Operations ---
function addTask(task) {
    tasks.push({
        id: Date.now().toString(),
        completed: false,
        ...task
    });
    updateUI();
}

function updateTask(id, updatedData) {
    tasks = tasks.map(t => t.id === id ? { ...t, ...updatedData } : t);
    updateUI();
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        updateUI();
    }
}

function toggleTask(id) {
    tasks = tasks.map(t => {
        if (t.id === id) {
            const newStatus = !t.completed;
            if (newStatus && window.confetti) {
                confetti({
                    particleCount: 80,
                    spread: 40,
                    origin: { y: 0.8 },
                    colors: ['#4f46e5', '#10b981'],
                    ticks: 200
                });
            }
            return { ...t, completed: newStatus };
        }
        return t;
    });
    updateUI();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initAuth();

    // Setup Nav Filters
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) activeNav.classList.remove('active');
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            if (viewTitle) viewTitle.textContent = currentFilter === 'all' ? 'All Tasks' : `${currentFilter} Priority`;
            updateUI();
        });
    });
});

// --- Modal Logic ---
if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
        modalTitle.textContent = 'New Task';
        taskForm.reset();
        document.getElementById('task-id').value = '';
        taskModal.classList.add('active');
    });
}

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        taskModal.classList.remove('active');
    });
});

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    modalTitle.textContent = 'Edit Task';
    document.getElementById('task-id').value = task.id;
    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description;
    document.getElementById('priority').value = task.priority;
    document.getElementById('due-date').value = task.dueDate;

    taskModal.classList.add('active');
}

if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('task-id').value;
        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            priority: document.getElementById('priority').value,
            dueDate: document.getElementById('due-date').value
        };

        if (id) {
            updateTask(id, taskData);
        } else {
            addTask(taskData);
        }
        taskModal.classList.remove('active');
    });
}

// --- Helpers ---
function saveToLocalStorage() {
    if (currentUser) {
        localStorage.setItem(`focusflow_tasks_${currentUser}`, JSON.stringify(tasks));
    }
}

function setCurrentDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

if (taskSearch) {
    taskSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTasks();
    });
}

// --- Pomodoro Logic ---
function updatePomoDisplay() {
    const mins = pomoMinutes < 10 ? `0${pomoMinutes}` : pomoMinutes;
    const secs = pomoSeconds < 10 ? `0${pomoSeconds}` : pomoSeconds;
    if (pomoTimerEl) pomoTimerEl.textContent = `${mins}:${secs}`;
}

function startPomo() {
    if (isPomoRunning) return;
    isPomoRunning = true;
    pomoStartBtn.classList.add('hidden');
    pomoPauseBtn.classList.remove('hidden');

    pomoInterval = setInterval(() => {
        if (pomoSeconds === 0) {
            if (pomoMinutes === 0) {
                clearInterval(pomoInterval);
                finishPomoSession();
                return;
            }
            pomoMinutes--;
            pomoSeconds = 59;
        } else {
            pomoSeconds--;
        }
        updatePomoDisplay();
    }, 1000);
}

function pausePomo() {
    isPomoRunning = false;
    clearInterval(pomoInterval);
    pomoStartBtn.classList.remove('hidden');
    pomoPauseBtn.classList.add('hidden');
}

function resetPomo() {
    pausePomo();
    pomoType = 'focus';
    pomoMinutes = 25;
    pomoSeconds = 0;
    if (pomoLabelEl) pomoLabelEl.textContent = 'Focus Session';
    updatePomoDisplay();
}

function finishPomoSession() {
    isPomoRunning = false;
    pomoStartBtn.classList.remove('hidden');
    pomoPauseBtn.classList.add('hidden');

    if (pomoType === 'focus') {
        alert('Focus session complete! Take a break.');
        pomoType = 'break';
        pomoMinutes = 5;
        if (pomoLabelEl) pomoLabelEl.textContent = 'Break Time';
    } else {
        alert('Break over! Back to work.');
        pomoType = 'focus';
        pomoMinutes = 25;
        if (pomoLabelEl) pomoLabelEl.textContent = 'Focus Session';
    }
    pomoSeconds = 0;
    updatePomoDisplay();

    // Play sound or show notification here
}

if (pomoStartBtn) pomoStartBtn.addEventListener('click', startPomo);
if (pomoPauseBtn) pomoPauseBtn.addEventListener('click', pausePomo);
if (pomoResetBtn) pomoResetBtn.addEventListener('click', resetPomo);

window.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        taskModal.classList.remove('active');
    }
});
