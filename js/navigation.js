// ============================================
// NAVEGACIÓN Y STEPPER - TEBI 2035
// ============================================

/**
 * Inicializa el stepper lateral
 */
function initStepper() {
    const stepperContainer = document.getElementById('stepper');
    if (!stepperContainer) return;

    stepperContainer.innerHTML = CONFIG.STEPS.map((step, index) => {
        let timerLabel = '';
        if (step.hasTask && step.taskDuration > 0) {
            timerLabel = `<span class="text-xs text-blue-500 hidden md:inline"><i class="fas fa-pencil-alt mr-1"></i>${Math.floor(step.taskDuration/60)} min</span>`;
        } else if (step.hasTimer && step.taskDuration > 0) {
            timerLabel = `<span class="text-xs text-gray-500 hidden md:inline"><i class="fas fa-clock mr-1"></i>${Math.floor(step.taskDuration/60)} min</span>`;
        }

        return `
        <div class="stepper-item flex items-center cursor-pointer ${index === 0 ? 'active' : ''}"
             data-step="${step.id}"
             onclick="goToStep(${step.id})">
            <div class="stepper-circle w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3 bg-white">
                <i class="fas ${step.icon} text-gray-400"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-sm text-gray-600 font-medium hidden md:inline">${step.title}</span>
                ${timerLabel}
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Actualiza la barra de progreso
 */
function updateProgress() {
    const progress = ((APP_STATE.currentStep - 1) / (APP_STATE.totalSteps - 1)) * 100;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${Math.round(progress)}%`;
}

/**
 * Actualiza el estado visual del stepper
 */
function updateStepper() {
    document.querySelectorAll('.stepper-item').forEach((item, index) => {
        const stepNum = index + 1;
        const circle = item.querySelector('.stepper-circle');
        const icon = circle.querySelector('i');

        // Limpiar clases
        item.classList.remove('active', 'completed');
        circle.classList.remove('bg-blue-600', 'bg-green-500', 'border-blue-600', 'border-green-500');
        icon.classList.remove('text-white', 'text-blue-600', 'text-green-500');
        icon.classList.add('text-gray-400');

        if (stepNum < APP_STATE.currentStep) {
            // Paso completado
            item.classList.add('completed');
            circle.classList.add('bg-green-500', 'border-green-500');
            icon.classList.remove('text-gray-400');
            icon.classList.add('text-white');
        } else if (stepNum === APP_STATE.currentStep) {
            // Paso actual
            item.classList.add('active');
            circle.classList.add('bg-blue-600', 'border-blue-600');
            icon.classList.remove('text-gray-400');
            icon.classList.add('text-white');
        }
    });
}

/**
 * Muestra un paso específico
 */
function showStep(stepNum) {
    // Ocultar todos los pasos
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });

    // Mostrar el paso actual
    const stepContent = document.querySelector(`.step-content[data-step="${stepNum}"]`);
    if (stepContent) {
        stepContent.classList.add('active');
    }

    // Actualizar indicador
    const stepIndicator = document.getElementById('step-indicator');
    if (stepIndicator) {
        stepIndicator.textContent = `Paso ${stepNum} de ${APP_STATE.totalSteps}`;
    }

    // Actualizar botones de navegación
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (prevBtn) prevBtn.disabled = stepNum === 1;

    if (nextBtn) {
        if (stepNum === APP_STATE.totalSteps) {
            nextBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Finalizar';
        } else {
            nextBtn.innerHTML = 'Siguiente<i class="fas fa-arrow-right ml-2"></i>';
        }
    }

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Inicializar sistema de cronómetro/tareas para el paso
    initStepTimer(stepNum);
}

/**
 * Navega a un paso específico
 */
function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > APP_STATE.totalSteps) return;

    // Verificar si se puede navegar
    if (!canNavigateToStep(stepNum)) {
        showNavigationBlockedMessage();
        return;
    }

    APP_STATE.currentStep = stepNum;
    showStep(stepNum);
    updateStepper();
    updateProgress();
    saveProgress(stepNum, false);
}

/**
 * Muestra mensaje cuando la navegación está bloqueada
 */
function showNavigationBlockedMessage() {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
    notification.innerHTML = '<i class="fas fa-lock"></i><span>Debes completar la tarea actual antes de continuar</span>';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Inicializa los event listeners de navegación
 */
function initNavigationListeners() {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (APP_STATE.currentStep < APP_STATE.totalSteps) {
                // Verificar si se puede avanzar (tiene cronómetro activo sin completar)
                const currentStepConfig = CONFIG.STEPS[APP_STATE.currentStep - 1];
                const hasTimerOrTask = currentStepConfig && (currentStepConfig.hasTask || currentStepConfig.hasTimer) && currentStepConfig.taskDuration > 0;

                if (hasTimerOrTask && !APP_STATE.stepTimerCompleted[APP_STATE.currentStep]) {
                    showNavigationBlockedMessage();
                    return;
                }

                saveProgress(APP_STATE.currentStep, true);
                APP_STATE.currentStep++;
                showStep(APP_STATE.currentStep);
                updateStepper();
                updateProgress();
                saveProgress(APP_STATE.currentStep, false);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (APP_STATE.currentStep > 1) {
                APP_STATE.currentStep--;
                showStep(APP_STATE.currentStep);
                updateStepper();
                updateProgress();
            }
        });
    }
}
