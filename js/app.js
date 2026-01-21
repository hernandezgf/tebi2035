// ============================================
// APLICACIÓN PRINCIPAL - TEBI 2035
// ============================================

/**
 * Inicializa la aplicación después del login
 */
async function initApp() {
    // Inicializar stepper
    initStepper();
    updateProgress();

    // Cargar tareas guardadas
    loadSavedTasks();

    // Mostrar el paso actual
    showStep(APP_STATE.currentStep);
    updateStepper();

    // Inicializar listeners de navegación
    initNavigationListeners();

    // Inicializar quiz
    initQuizListeners();

    // Verificar si el quiz ya fue tomado
    if (checkIfQuizTaken()) {
        lockQuiz();
    }
}

/**
 * Maneja el login del estudiante
 */
async function handleLogin(studentId) {
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verificando...';
    loginError.classList.add('hidden');

    const result = await verifyStudent(studentId);

    if (result.success) {
        APP_STATE.currentStudent = result;
        APP_STATE.isOnlineMode = !result.offline;

        // Mostrar nombre del estudiante
        const userNameEl = document.getElementById('user-name');
        const userInfoEl = document.getElementById('user-info');

        if (userNameEl) userNameEl.textContent = result.name;
        if (userInfoEl) userInfoEl.classList.remove('hidden');

        // Ocultar modal
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('modal-hidden');

        // Cargar progreso guardado
        await loadSavedProgress(studentId);

        // Iniciar aplicación
        await initApp();

    } else {
        const errorSpan = loginError.querySelector('span');
        if (errorSpan) {
            errorSpan.textContent = result.error || 'ID no encontrado. Contacta al profesor.';
        }
        loginError.classList.remove('hidden');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Ingresar</span><i class="fas fa-arrow-right"></i>';
    }
}

/**
 * Carga el progreso guardado del estudiante
 */
async function loadSavedProgress(studentId) {
    let savedProgress = null;

    if (APP_STATE.isOnlineMode) {
        savedProgress = await loadStudentProgress(studentId);
    }

    // Si no hay progreso online, intentar cargar del localStorage
    if (!savedProgress) {
        savedProgress = JSON.parse(localStorage.getItem(`progress_${CONFIG.MODULE_ID}`) || 'null');
    }

    if (savedProgress && savedProgress.currentStep) {
        // Restaurar pasos completados
        if (savedProgress.completedSteps && savedProgress.completedSteps.length > 0) {
            savedProgress.completedSteps.forEach(step => {
                APP_STATE.stepTimerCompleted[step] = true;
            });
        }
        APP_STATE.currentStep = savedProgress.currentStep;
    }
}

/**
 * Inicializa los event listeners del DOM
 */
function initDOMListeners() {
    // Formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const studentIdInput = document.getElementById('student-id');
            const studentId = studentIdInput.value.trim().toUpperCase();
            handleLogin(studentId);
        });
    }

    // Focus en el campo de ID al cargar
    const studentIdInput = document.getElementById('student-id');
    if (studentIdInput) {
        studentIdInput.focus();
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDOMListeners();
});
