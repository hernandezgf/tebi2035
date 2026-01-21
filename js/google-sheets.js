// ============================================
// FUNCIONES DE GOOGLE SHEETS - TEBI 2035
// ============================================

/**
 * Muestra indicador de sincronización
 */
function showSyncIndicator(status, message) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;

    indicator.classList.remove('modal-hidden', 'sync-saving', 'sync-saved', 'sync-error');
    indicator.classList.add(`sync-${status}`);

    const icon = status === 'saving' ? 'sync-alt fa-spin' : status === 'saved' ? 'check' : 'exclamation-triangle';
    indicator.innerHTML = `<i class="fas fa-${icon} mr-2"></i><span>${message}</span>`;

    if (status !== 'saving') {
        setTimeout(() => indicator.classList.add('modal-hidden'), 3000);
    }
}

/**
 * Verifica si un estudiante existe en la base de datos
 */
async function verifyStudent(studentId) {
    if (CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        return { success: true, offline: true, name: 'Estudiante (Modo Local)', studentId: studentId };
    }

    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=verify&studentId=${encodeURIComponent(studentId)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error verificando estudiante:', error);
        return { success: false, error: 'Error de conexión' };
    }
}

/**
 * Carga el progreso guardado del estudiante
 */
async function loadStudentProgress(studentId) {
    if (!APP_STATE.isOnlineMode) return null;

    try {
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=getProgress&studentId=${encodeURIComponent(studentId)}&moduleId=${CONFIG.MODULE_ID}`);
        const data = await response.json();
        return data.success ? data.progress : null;
    } catch (error) {
        console.error('Error cargando progreso:', error);
        return null;
    }
}

/**
 * Guarda el progreso del estudiante
 */
async function saveProgress(stepNum, completed = false) {
    // Guardar en localStorage
    const localProgress = JSON.parse(localStorage.getItem(`progress_${CONFIG.MODULE_ID}`) || '{}');
    localProgress.currentStep = stepNum;
    localProgress.completedSteps = localProgress.completedSteps || [];

    if (completed && !localProgress.completedSteps.includes(stepNum)) {
        localProgress.completedSteps.push(stepNum);
    }

    localProgress.lastUpdated = new Date().toISOString();
    localStorage.setItem(`progress_${CONFIG.MODULE_ID}`, JSON.stringify(localProgress));

    // Si está en modo online, guardar en Google Sheets
    if (APP_STATE.isOnlineMode && APP_STATE.currentStudent) {
        showSyncIndicator('saving', 'Guardando...');
        try {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveProgress',
                    studentId: APP_STATE.currentStudent.studentId,
                    moduleId: CONFIG.MODULE_ID,
                    currentStep: stepNum,
                    completedSteps: localProgress.completedSteps,
                    timestamp: new Date().toISOString()
                })
            });
            showSyncIndicator('saved', 'Guardado');
        } catch (error) {
            showSyncIndicator('error', 'Error al guardar');
        }
    }
}

/**
 * Guarda una respuesta del quiz
 */
async function saveQuizAnswer(questionNum, answer, isCorrect) {
    // Guardar en localStorage
    const localQuiz = JSON.parse(localStorage.getItem(`quiz_${CONFIG.MODULE_ID}`) || '{}');
    localQuiz[`q${questionNum}`] = { answer, isCorrect, timestamp: new Date().toISOString() };
    localStorage.setItem(`quiz_${CONFIG.MODULE_ID}`, JSON.stringify(localQuiz));

    // Si está en modo online, guardar en Google Sheets
    if (APP_STATE.isOnlineMode && APP_STATE.currentStudent) {
        try {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveQuizAnswer',
                    studentId: APP_STATE.currentStudent.studentId,
                    moduleId: CONFIG.MODULE_ID,
                    questionNum: questionNum,
                    answer: answer,
                    isCorrect: isCorrect,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error guardando respuesta:', error);
        }
    }
}

/**
 * Guarda la respuesta de una tarea escrita
 */
async function saveTaskResponse(taskId, response, timedOut) {
    const timestamp = new Date().toISOString();

    // Guardar en localStorage
    const taskData = {
        response: response,
        completed: true,
        timedOut: timedOut,
        timestamp: timestamp,
        charCount: response.length
    };
    localStorage.setItem(`task_${CONFIG.MODULE_ID}_${taskId}`, JSON.stringify(taskData));

    // Si está en modo online, guardar en Google Sheets
    if (APP_STATE.isOnlineMode && APP_STATE.currentStudent) {
        showSyncIndicator('saving', 'Guardando tarea...');
        try {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveTaskResponse',
                    studentId: APP_STATE.currentStudent.studentId,
                    moduleId: CONFIG.MODULE_ID,
                    taskId: taskId,
                    response: response,
                    timedOut: timedOut,
                    charCount: response.length,
                    timestamp: timestamp
                })
            });
            showSyncIndicator('saved', 'Tarea guardada');
        } catch (error) {
            showSyncIndicator('error', 'Error al guardar tarea');
            console.error('Error guardando tarea:', error);
        }
    }
}
