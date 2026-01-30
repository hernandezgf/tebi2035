// ============================================
// FUNCIONES DE GOOGLE SHEETS - TEBI 2035
// ============================================

/**
 * FUNCIÓN DE PRUEBA - Llamar desde consola: testTaskSave()
 */
function testTaskSave() {
    console.log('=== PRUEBA DE GUARDADO ===');
    console.log('URL:', CONFIG.GOOGLE_SCRIPT_URL);

    var data = {
        action: 'saveTaskResponse',
        studentId: 'TEST-CONSOLA',
        moduleId: 'test',
        taskId: 'prueba-directa',
        response: 'Prueba desde consola',
        charCount: 20,
        timedOut: false,
        timestamp: new Date().toISOString()
    };
    console.log('Data:', JSON.stringify(data));

    // Prueba SIN no-cors para ver el error real
    fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data),
        redirect: 'follow'
    })
    .then(function(response) {
        console.log('Response status:', response.status);
        return response.text();
    })
    .then(function(text) {
        console.log('Response:', text);
    })
    .catch(function(err) {
        console.error('Error:', err);
    });
}

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
    console.log('[VERIFY] Iniciando verificacion para:', studentId);
    console.log('[VERIFY] URL:', CONFIG.GOOGLE_SCRIPT_URL);

    if (CONFIG.GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.log('[VERIFY] URL no configurada - Modo offline');
        return { success: true, offline: true, name: 'Estudiante (Modo Local)', studentId: studentId };
    }

    try {
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?action=verify&studentId=${encodeURIComponent(studentId)}`;
        console.log('[VERIFY] Haciendo fetch a:', url);

        const response = await fetch(url);
        console.log('[VERIFY] Response status:', response.status);

        const data = await response.json();
        console.log('[VERIFY] Respuesta:', data);

        return data;
    } catch (error) {
        console.error('[VERIFY] Error verificando estudiante:', error);
        // En caso de error de conexion, permitir modo offline
        return { success: true, offline: true, name: 'Estudiante (Sin conexion)', studentId: studentId };
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
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'saveProgress',
                    studentId: APP_STATE.currentStudent.studentId,
                    moduleId: CONFIG.MODULE_ID,
                    currentStep: stepNum,
                    completedSteps: localProgress.completedSteps,
                    timestamp: new Date().toISOString()
                }),
                redirect: 'follow'
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
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'saveQuizAnswer',
                    studentId: APP_STATE.currentStudent.studentId,
                    moduleId: CONFIG.MODULE_ID,
                    questionNum: questionNum,
                    answer: answer,
                    isCorrect: isCorrect,
                    timestamp: new Date().toISOString()
                }),
                redirect: 'follow'
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

    console.log('[SAVE_TASK] Iniciando guardado de tarea:', {
        taskId: taskId,
        responseLength: response.length,
        timedOut: timedOut,
        isOnlineMode: APP_STATE.isOnlineMode,
        currentStudent: APP_STATE.currentStudent
    });

    // Guardar en localStorage (sin syncedToCloud aún)
    const taskData = {
        response: response,
        completed: true,
        timedOut: timedOut,
        timestamp: timestamp,
        charCount: response.length,
        syncedToCloud: false
    };
    localStorage.setItem(`task_${CONFIG.MODULE_ID}_${taskId}`, JSON.stringify(taskData));
    console.log('[SAVE_TASK] Guardado en localStorage OK');

    // Si está en modo online, guardar en Google Sheets
    if (APP_STATE.isOnlineMode && APP_STATE.currentStudent) {
        const syncSuccess = await syncTaskToGoogleSheets(taskId, response, timedOut, timestamp);
        if (syncSuccess) {
            // Actualizar localStorage con syncedToCloud = true
            taskData.syncedToCloud = true;
            localStorage.setItem(`task_${CONFIG.MODULE_ID}_${taskId}`, JSON.stringify(taskData));
        }
    } else {
        console.log('[SAVE_TASK] Modo OFFLINE - No se envio a Google Sheets');
        console.log('[SAVE_TASK] isOnlineMode:', APP_STATE.isOnlineMode);
        console.log('[SAVE_TASK] currentStudent:', APP_STATE.currentStudent);
    }
}

/**
 * Envía una tarea a Google Sheets
 */
async function syncTaskToGoogleSheets(taskId, response, timedOut, timestamp) {
    console.log('[SYNC_TASK] Enviando a Google Sheets...');
    showSyncIndicator('saving', 'Guardando tarea...');

    try {
        const payload = {
            action: 'saveTaskResponse',
            studentId: APP_STATE.currentStudent.studentId,
            moduleId: CONFIG.MODULE_ID,
            taskId: taskId,
            response: response,
            timedOut: timedOut,
            charCount: response.length,
            timestamp: timestamp
        };
        console.log('[SYNC_TASK] Payload:', payload);

        const fetchResponse = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const result = await fetchResponse.json();
        console.log('[SYNC_TASK] Response:', result);

        if (result.success) {
            showSyncIndicator('saved', 'Tarea guardada');
            console.log('[SYNC_TASK] Enviado a Google Sheets OK');
            return true;
        } else {
            showSyncIndicator('error', 'Error al guardar');
            console.error('[SYNC_TASK] Error:', result.error);
            return false;
        }
    } catch (error) {
        showSyncIndicator('error', 'Error al guardar tarea');
        console.error('[SYNC_TASK] Error guardando tarea:', error);
        return false;
    }
}

/**
 * Reintenta sincronizar una tarea que no fue enviada a Google Sheets
 */
async function retrySyncTask(taskId) {
    const savedTask = JSON.parse(localStorage.getItem(`task_${CONFIG.MODULE_ID}_${taskId}`) || 'null');

    if (!savedTask || !savedTask.completed) {
        console.log('[RETRY_SYNC] No hay tarea completada para sincronizar');
        return false;
    }

    if (savedTask.syncedToCloud) {
        console.log('[RETRY_SYNC] La tarea ya fue sincronizada anteriormente');
        return true;
    }

    if (!APP_STATE.isOnlineMode || !APP_STATE.currentStudent) {
        console.log('[RETRY_SYNC] No hay conexión o estudiante - no se puede sincronizar');
        return false;
    }

    console.log('[RETRY_SYNC] Reintentando sincronizar tarea:', taskId);
    const syncSuccess = await syncTaskToGoogleSheets(
        taskId,
        savedTask.response,
        savedTask.timedOut,
        savedTask.timestamp
    );

    if (syncSuccess) {
        // Actualizar localStorage con syncedToCloud = true
        savedTask.syncedToCloud = true;
        localStorage.setItem(`task_${CONFIG.MODULE_ID}_${taskId}`, JSON.stringify(savedTask));
        console.log('[RETRY_SYNC] Tarea sincronizada exitosamente');
    }

    return syncSuccess;
}
