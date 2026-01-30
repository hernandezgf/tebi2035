// ============================================
// SISTEMA DE TAREAS Y CRONÓMETROS - TEBI 2035
// ============================================
// Soporta dos modos:
// 1. hasTask: true - Tarea escrita con textarea (cronómetro inicia al escribir)
// 2. hasTimer: true - Solo cronómetro (tiempo mínimo para avanzar, inicia automáticamente)

const TASK_STATE = {
    timers: {},           // Intervalos activos
    status: {},           // Estado de cada tarea/timer
    startTimes: {},       // Tiempo de inicio
    remainingTimes: {},   // Tiempo restante
    hasStarted: {}        // Si el cronómetro ha iniciado
};

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializa el sistema para un paso específico
 */
async function initStepTimer(stepNum) {
    console.log('[TIMER] initStepTimer llamado para step:', stepNum);
    const step = CONFIG.STEPS[stepNum - 1];
    if (!step) {
        console.log('[TIMER] Step no encontrado');
        return;
    }

    console.log('[TIMER] Step config:', JSON.stringify(step));

    // Determinar el tipo de cronómetro
    if (step.hasTask && step.taskDuration > 0) {
        console.log('[TIMER] Iniciando TaskSystem (hasTask)');
        await initTaskSystem(stepNum);
    } else if (step.hasTimer && step.taskDuration > 0) {
        console.log('[TIMER] Iniciando SimpleTimer (hasTimer)');
        initSimpleTimer(stepNum);
    } else {
        console.log('[TIMER] Sin cronómetro - desbloqueando navegación');
        // Sin cronómetro - desbloquear navegación
        unlockNavigation(stepNum);
    }
}

/**
 * Inicializa el sistema de tareas (con textarea)
 */
async function initTaskSystem(stepNum) {
    const step = CONFIG.STEPS[stepNum - 1];
    const taskId = step.taskId;

    console.log('[TASK] initTaskSystem para step:', stepNum, 'taskId:', taskId);

    // Verificar si la tarea ya fue completada
    const savedTask = getSavedTask(taskId);
    console.log('[TASK] Tarea guardada:', savedTask);
    if (savedTask && savedTask.completed) {
        console.log('[TASK] Tarea ya completada, mostrando estado completado');

        // Verificar si necesita sincronización con Google Sheets
        if (!savedTask.syncedToCloud && APP_STATE.isOnlineMode && APP_STATE.currentStudent) {
            console.log('[TASK] Tarea no sincronizada, reintentando...');
            await retrySyncTask(taskId);
        }

        showTaskCompleted(taskId, savedTask.response);
        unlockNavigation(stepNum);
        return;
    }

    // Verificar si hay tiempo guardado
    const savedTime = getSavedTaskTime(taskId);
    console.log('[TASK] Tiempo guardado:', savedTime);
    if (savedTime && savedTime.hasStarted) {
        const elapsed = Math.floor((Date.now() - savedTime.savedAt) / 1000);
        const remaining = Math.max(0, savedTime.remaining - elapsed);
        console.log('[TASK] Continuando timer - elapsed:', elapsed, 'remaining:', remaining);

        if (remaining > 0) {
            TASK_STATE.hasStarted[taskId] = true;
            TASK_STATE.remainingTimes[taskId] = remaining;
            startCountdown(taskId, stepNum, remaining, true);
            updateTimerDisplay(taskId, remaining);
            showTimerActive(taskId);
        } else {
            completeTaskByTimeout(taskId, stepNum);
        }
    } else {
        console.log('[TASK] Configurando trigger de escritura, duración:', step.taskDuration);
        TASK_STATE.remainingTimes[taskId] = step.taskDuration;
        setupWritingTrigger(taskId, stepNum);
    }

    console.log('[TASK] Bloqueando navegación');
    lockNavigation(stepNum);
}

/**
 * Inicializa un cronómetro simple (sin textarea)
 */
function initSimpleTimer(stepNum) {
    const step = CONFIG.STEPS[stepNum - 1];
    const timerId = `step${stepNum}`;

    // Verificar si ya se completó el tiempo
    const savedTime = getSavedStepTime(stepNum);
    if (savedTime && savedTime.completed) {
        unlockNavigation(stepNum);
        hideHeaderTimer();
        return;
    }

    // Verificar si hay tiempo guardado
    if (savedTime && savedTime.hasStarted) {
        const elapsed = Math.floor((Date.now() - savedTime.savedAt) / 1000);
        const remaining = Math.max(0, savedTime.remaining - elapsed);

        if (remaining > 0) {
            TASK_STATE.hasStarted[timerId] = true;
            startSimpleCountdown(stepNum, remaining);
        } else {
            completeSimpleTimer(stepNum);
        }
    } else {
        // Iniciar cronómetro automáticamente
        TASK_STATE.hasStarted[timerId] = true;
        startSimpleCountdown(stepNum, step.taskDuration);
    }

    lockNavigation(stepNum);
}

// ============================================
// CRONÓMETRO SIMPLE (Solo tiempo mínimo)
// ============================================

function startSimpleCountdown(stepNum, duration) {
    const timerId = `step${stepNum}`;

    if (TASK_STATE.timers[timerId]) {
        clearInterval(TASK_STATE.timers[timerId]);
    }

    TASK_STATE.remainingTimes[timerId] = duration;
    TASK_STATE.startTimes[timerId] = Date.now();
    TASK_STATE.status[timerId] = 'in_progress';

    saveStepTime(stepNum, duration, false);
    updateHeaderTimer(duration);
    showHeaderTimerActive();

    TASK_STATE.timers[timerId] = setInterval(() => {
        TASK_STATE.remainingTimes[timerId]--;
        const remaining = TASK_STATE.remainingTimes[timerId];

        updateHeaderTimer(remaining);
        saveStepTime(stepNum, remaining, false);

        // Cambiar estilo según tiempo restante
        if (remaining <= 120 && remaining > 60) {
            showHeaderTimerWarning();
        } else if (remaining <= 60) {
            showHeaderTimerCritical();
        }

        if (remaining <= 0) {
            clearInterval(TASK_STATE.timers[timerId]);
            TASK_STATE.timers[timerId] = null;
            completeSimpleTimer(stepNum);
        }
    }, 1000);
}

function completeSimpleTimer(stepNum) {
    const timerId = `step${stepNum}`;
    TASK_STATE.status[timerId] = 'completed';
    saveStepTime(stepNum, 0, true);
    unlockNavigation(stepNum);
    showHeaderTimerComplete();
}

// ============================================
// FUNCIONES DEL HEADER TIMER
// ============================================

function updateHeaderTimer(seconds) {
    const headerTimer = document.getElementById('timer-display');
    const headerTimerText = document.getElementById('timer-text');

    if (headerTimer && headerTimerText) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        headerTimerText.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        headerTimer.classList.remove('hidden');
    }
}

function showHeaderTimerActive() {
    const headerTimer = document.getElementById('timer-display');
    if (headerTimer) {
        headerTimer.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-amber-100', 'text-amber-700', 'bg-red-100', 'text-red-700');
        headerTimer.classList.add('bg-blue-100', 'text-blue-700');
    }
}

function showHeaderTimerWarning() {
    const headerTimer = document.getElementById('timer-display');
    if (headerTimer) {
        headerTimer.classList.remove('bg-blue-100', 'text-blue-700', 'bg-red-100', 'text-red-700');
        headerTimer.classList.add('bg-amber-100', 'text-amber-700');
    }
}

function showHeaderTimerCritical() {
    const headerTimer = document.getElementById('timer-display');
    if (headerTimer) {
        headerTimer.classList.remove('bg-blue-100', 'text-blue-700', 'bg-amber-100', 'text-amber-700');
        headerTimer.classList.add('bg-red-100', 'text-red-700');
    }
}

function showHeaderTimerComplete() {
    const headerTimer = document.getElementById('timer-display');
    const headerTimerText = document.getElementById('timer-text');

    if (headerTimer && headerTimerText) {
        headerTimer.classList.remove('bg-blue-100', 'text-blue-700', 'bg-amber-100', 'text-amber-700', 'bg-red-100', 'text-red-700');
        headerTimer.classList.add('bg-green-100', 'text-green-700');
        headerTimerText.innerHTML = '<i class="fas fa-check mr-1"></i>Listo';

        setTimeout(() => headerTimer.classList.add('hidden'), 2000);
    }
}

function hideHeaderTimer() {
    const headerTimer = document.getElementById('timer-display');
    if (headerTimer) {
        headerTimer.classList.add('hidden');
    }
}

// ============================================
// SISTEMA DE TAREAS CON TEXTAREA
// ============================================

function setupWritingTrigger(taskId, stepNum) {
    console.log('[TRIGGER] Buscando textarea con id:', `task-response-${taskId}`);
    const textarea = document.getElementById(`task-response-${taskId}`);
    if (!textarea) {
        console.error('[TRIGGER] ERROR: Textarea NO encontrado!');
        return;
    }
    console.log('[TRIGGER] Textarea encontrado:', textarea);

    showWaitingToStart(taskId);

    const startHandler = function(e) {
        console.log('[TRIGGER] Input detectado, valor length:', textarea.value.length);
        if (!TASK_STATE.hasStarted[taskId] && textarea.value.length > 0) {
            console.log('[TRIGGER] Iniciando countdown!');
            TASK_STATE.hasStarted[taskId] = true;
            textarea.removeEventListener('input', startHandler);

            const step = CONFIG.STEPS[stepNum - 1];
            startCountdown(taskId, stepNum, step.taskDuration, true);
            showTimerActive(taskId);
        }
    };

    textarea.addEventListener('input', startHandler);
    console.log('[TRIGGER] Event listener agregado al textarea');
}

function startCountdown(taskId, stepNum, duration, isTask) {
    console.log('[COUNTDOWN] Iniciando countdown - taskId:', taskId, 'duration:', duration, 'isTask:', isTask);

    if (TASK_STATE.timers[taskId]) {
        clearInterval(TASK_STATE.timers[taskId]);
    }

    TASK_STATE.remainingTimes[taskId] = duration;
    TASK_STATE.startTimes[taskId] = Date.now();
    TASK_STATE.status[taskId] = 'in_progress';

    saveTaskTime(taskId, duration);
    updateTimerDisplay(taskId, duration);
    updateHeaderTimer(duration);
    console.log('[COUNTDOWN] Timer display actualizado');

    TASK_STATE.timers[taskId] = setInterval(() => {
        TASK_STATE.remainingTimes[taskId]--;
        const remaining = TASK_STATE.remainingTimes[taskId];

        updateTimerDisplay(taskId, remaining);
        updateHeaderTimer(remaining);
        saveTaskTime(taskId, remaining);

        if (remaining <= 120 && remaining > 60) {
            showTimerWarning(taskId);
            showHeaderTimerWarning();
        } else if (remaining <= 60) {
            showTimerCritical(taskId);
            showHeaderTimerCritical();
        }

        if (remaining <= 0) {
            clearInterval(TASK_STATE.timers[taskId]);
            TASK_STATE.timers[taskId] = null;
            if (isTask) {
                completeTaskByTimeout(taskId, stepNum);
            }
        }
    }, 1000);
}

function completeTaskByTimeout(taskId, stepNum) {
    const textarea = document.getElementById(`task-response-${taskId}`);
    const response = textarea ? textarea.value.trim() : '';

    saveTaskResponse(taskId, response, true);
    TASK_STATE.status[taskId] = 'completed';

    const inputContainer = document.getElementById(`task-input-container-${taskId}`);
    const timeoutContainer = document.getElementById(`task-timeout-${taskId}`);

    if (inputContainer) inputContainer.classList.add('hidden');
    if (timeoutContainer) timeoutContainer.classList.remove('hidden');

    if (response) {
        const savedResponseEl = document.getElementById(`saved-response-${taskId}`);
        const completedContainer = document.getElementById(`task-completed-${taskId}`);
        if (savedResponseEl) savedResponseEl.textContent = response;
        if (completedContainer) completedContainer.classList.remove('hidden');
    }

    unlockNavigation(stepNum);
    clearSavedTaskTime(taskId);
    showHeaderTimerComplete();
}

function showTaskCompleted(taskId, response) {
    const inputContainer = document.getElementById(`task-input-container-${taskId}`);
    const completedContainer = document.getElementById(`task-completed-${taskId}`);
    const savedResponseEl = document.getElementById(`saved-response-${taskId}`);
    const waitingEl = document.getElementById(`task-waiting-${taskId}`);

    if (inputContainer) inputContainer.classList.add('hidden');
    if (waitingEl) waitingEl.classList.add('hidden');
    if (savedResponseEl) savedResponseEl.textContent = response;
    if (completedContainer) completedContainer.classList.remove('hidden');

    TASK_STATE.status[taskId] = 'completed';
}

// ============================================
// VISUALIZACIÓN DEL TIMER EN TAREAS
// ============================================

function updateTimerDisplay(taskId, seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const minutesEl = document.getElementById(`timer-minutes-${taskId}`);
    const secondsEl = document.getElementById(`timer-seconds-${taskId}`);

    if (minutesEl) minutesEl.textContent = mins.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = secs.toString().padStart(2, '0');
}

function showWaitingToStart(taskId) {
    const timerContainer = document.getElementById(`task-timer-${taskId}`);
    const waitingEl = document.getElementById(`task-waiting-${taskId}`);

    if (timerContainer) {
        timerContainer.classList.add('bg-gray-100', 'border-gray-300');
    }
    if (waitingEl) {
        waitingEl.classList.remove('hidden');
    }
}

function showTimerActive(taskId) {
    const timerContainer = document.getElementById(`task-timer-${taskId}`);
    const waitingEl = document.getElementById(`task-waiting-${taskId}`);

    if (waitingEl) waitingEl.classList.add('hidden');

    if (timerContainer) {
        timerContainer.classList.remove('bg-gray-100', 'border-gray-300', 'bg-amber-100', 'border-amber-400', 'bg-red-100', 'border-red-400');
        timerContainer.classList.add('bg-blue-100', 'border-blue-400');
    }

    const minutesEl = document.getElementById(`timer-minutes-${taskId}`);
    const secondsEl = document.getElementById(`timer-seconds-${taskId}`);
    if (minutesEl) minutesEl.classList.remove('text-amber-600', 'text-red-600');
    if (secondsEl) secondsEl.classList.remove('text-amber-600', 'text-red-600');

    showHeaderTimerActive();
}

function showTimerWarning(taskId) {
    const timerContainer = document.getElementById(`task-timer-${taskId}`);

    if (timerContainer) {
        timerContainer.classList.remove('bg-blue-100', 'border-blue-400');
        timerContainer.classList.add('bg-amber-100', 'border-amber-400');
    }

    const minutesEl = document.getElementById(`timer-minutes-${taskId}`);
    const secondsEl = document.getElementById(`timer-seconds-${taskId}`);
    if (minutesEl) minutesEl.classList.add('text-amber-600');
    if (secondsEl) secondsEl.classList.add('text-amber-600');
}

function showTimerCritical(taskId) {
    const timerContainer = document.getElementById(`task-timer-${taskId}`);

    if (timerContainer) {
        timerContainer.classList.remove('bg-blue-100', 'border-blue-400', 'bg-amber-100', 'border-amber-400');
        timerContainer.classList.add('bg-red-100', 'border-red-400');
    }

    const minutesEl = document.getElementById(`timer-minutes-${taskId}`);
    const secondsEl = document.getElementById(`timer-seconds-${taskId}`);
    if (minutesEl) {
        minutesEl.classList.remove('text-amber-600');
        minutesEl.classList.add('text-red-600');
    }
    if (secondsEl) {
        secondsEl.classList.remove('text-amber-600');
        secondsEl.classList.add('text-red-600');
    }
}

function showTaskError(taskId, message) {
    const errorEl = document.getElementById(`task-error-${taskId}`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 3000);
    } else {
        alert(message);
    }
}

// ============================================
// NAVEGACIÓN
// ============================================

function lockNavigation(stepNum) {
    console.log('[NAV] lockNavigation para step:', stepNum);
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        console.log('[NAV] Botón siguiente encontrado, deshabilitando');
        nextBtn.disabled = true;
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        nextBtn.innerHTML = '<i class="fas fa-clock mr-2"></i>Espera el tiempo';
    } else {
        console.error('[NAV] ERROR: Botón siguiente NO encontrado!');
    }

    APP_STATE.stepTimerCompleted[stepNum] = false;
}

function unlockNavigation(stepNum) {
    const nextBtn = document.getElementById('next-btn');
    const totalSteps = CONFIG.STEPS.length;

    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');

        if (stepNum === totalSteps) {
            nextBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Finalizar';
        } else {
            nextBtn.innerHTML = 'Siguiente<i class="fas fa-arrow-right ml-2"></i>';
        }
    }

    APP_STATE.stepTimerCompleted[stepNum] = true;
}

function canNavigateToStep(targetStep) {
    if (targetStep < APP_STATE.currentStep) return true;

    for (let i = APP_STATE.currentStep; i < targetStep; i++) {
        const step = CONFIG.STEPS[i - 1];
        if (step && (step.hasTask || step.hasTimer) && step.taskDuration > 0 && !APP_STATE.stepTimerCompleted[i]) {
            return false;
        }
    }

    return true;
}

// ============================================
// PERSISTENCIA
// ============================================

function getSavedTask(taskId) {
    return JSON.parse(localStorage.getItem(`task_${CONFIG.MODULE_ID}_${taskId}`) || 'null');
}

function saveTaskTime(taskId, remaining) {
    const data = {
        hasStarted: TASK_STATE.hasStarted[taskId] || false,
        remaining: remaining,
        savedAt: Date.now()
    };
    localStorage.setItem(`taskTime_${CONFIG.MODULE_ID}_${taskId}`, JSON.stringify(data));
}

function getSavedTaskTime(taskId) {
    return JSON.parse(localStorage.getItem(`taskTime_${CONFIG.MODULE_ID}_${taskId}`) || 'null');
}

function clearSavedTaskTime(taskId) {
    localStorage.removeItem(`taskTime_${CONFIG.MODULE_ID}_${taskId}`);
}

function saveStepTime(stepNum, remaining, completed) {
    const data = {
        hasStarted: true,
        remaining: remaining,
        completed: completed,
        savedAt: Date.now()
    };
    localStorage.setItem(`stepTime_${CONFIG.MODULE_ID}_step${stepNum}`, JSON.stringify(data));
}

function getSavedStepTime(stepNum) {
    return JSON.parse(localStorage.getItem(`stepTime_${CONFIG.MODULE_ID}_step${stepNum}`) || 'null');
}

function loadSavedTasks() {
    CONFIG.STEPS.forEach(step => {
        // Cargar tareas con textarea
        if (step.hasTask && step.taskId) {
            const savedTask = getSavedTask(step.taskId);
            if (savedTask && savedTask.completed) {
                showTaskCompleted(step.taskId, savedTask.response);
                APP_STATE.stepTimerCompleted[step.id] = true;
            }
        }

        // Cargar cronómetros simples completados
        if (step.hasTimer) {
            const savedTime = getSavedStepTime(step.id);
            if (savedTime && savedTime.completed) {
                APP_STATE.stepTimerCompleted[step.id] = true;
            }
        }
    });
}

// ============================================
// CONTADOR DE CARACTERES
// ============================================

document.addEventListener('input', function(e) {
    if (e.target.id && e.target.id.startsWith('task-response-')) {
        const taskId = e.target.id.replace('task-response-', '');
        const charCountEl = document.getElementById(`char-count-${taskId}`);
        if (charCountEl) {
            charCountEl.textContent = `${e.target.value.length} caracteres`;
        }
    }
});

// ============================================
// BLOQUEAR PEGADO DE TEXTO EN TAREAS
// ============================================

document.addEventListener('paste', function(e) {
    if (e.target.id && e.target.id.startsWith('task-response-')) {
        e.preventDefault();

        // Mostrar notificación de que no se puede pegar
        const taskId = e.target.id.replace('task-response-', '');
        showPasteBlockedNotification(taskId);
    }
});

// También bloquear el menú contextual de pegar y atajos de teclado
document.addEventListener('keydown', function(e) {
    if (e.target.id && e.target.id.startsWith('task-response-')) {
        // Bloquear Ctrl+V, Cmd+V, Ctrl+Shift+V, Cmd+Shift+V
        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
            e.preventDefault();
            const taskId = e.target.id.replace('task-response-', '');
            showPasteBlockedNotification(taskId);
        }
    }
});

/**
 * Muestra una notificación cuando se intenta pegar texto
 */
function showPasteBlockedNotification(taskId) {
    // Verificar si ya existe una notificación
    let notification = document.getElementById('paste-blocked-notification');
    if (notification) {
        notification.remove();
    }

    // Crear nueva notificación
    notification = document.createElement('div');
    notification.id = 'paste-blocked-notification';
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    notification.innerHTML = '<i class="fas fa-ban"></i><span>No se permite pegar texto. Debes escribir tu respuesta.</span>';
    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}
