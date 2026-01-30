// ============================================
// CONFIGURACIÓN DEL MÓDULO 1B - TEBI 2035
// Transductores y Sensores
// ============================================

const CONFIG = {
    // URL del Google Apps Script (misma que Módulo 1A)
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzGJLPyP7mltJ__i07uUtfT8jrbxQW_0q2vEXTahot_ZqQiuMaWV0_lPP70zZd39VrGHw/exec',

    // ID del módulo actual
    MODULE_ID: 'modulo1b',

    // Configuración de los pasos del módulo
    // hasTask: true = tiene tarea escrita con textarea (cronómetro inicia al escribir)
    // hasTimer: true = solo cronómetro (tiempo mínimo para avanzar, inicia automáticamente)
    // taskDuration: tiempo en segundos
    // NOTA: Tiempos reducidos para PRUEBAS. Cambiar antes de implementar:
    // Step 1: 2 min, Step 2: 8 min, Step 3: 10 min, Step 4: 10 min,
    // Step 5: 8 min, Step 6: 12 min, Step 7: 3 min, Step 8: 10 min
    STEPS: [
        {
            id: 1,
            title: 'Introducción',
            icon: 'fa-home',
            hasTimer: true,
            taskDuration: 720  // 12 minutos (video de 10 min + 2 min extra)
        },
        {
            id: 2,
            title: 'Sensores vs Transductores',
            icon: 'fa-exchange-alt',
            hasTask: true,
            taskDuration: 720,  // 12 minutos
            taskId: 'step2-diferencias'
        },
        {
            id: 3,
            title: 'Características',
            icon: 'fa-sliders-h',
            hasTimer: true,
            taskDuration: 720  // 12 minutos
        },
        {
            id: 4,
            title: 'Tipos de Transductores',
            icon: 'fa-sitemap',
            hasVideoTimer: true,      // Timer para ver el video primero
            videoDuration: 1800,      // 30 minutos para el video
            hasTask: true,            // Luego tiene tarea escrita
            taskDuration: 600,        // 10 minutos para escribir
            taskId: 'step4-clasificacion'
        },
        {
            id: 5,
            title: 'Transductores Biomédicos',
            icon: 'fa-heartbeat',
            hasTimer: false,  // PRUEBA: sin timer
            taskDuration: 0
        },
        {
            id: 6,
            title: 'Biosensores',
            icon: 'fa-dna',
            hasVideoTimer: true,      // Timer para ver el video primero
            videoDuration: 840,       // 14 minutos para el video
            hasTask: true,            // Luego tiene tarea escrita
            taskDuration: 600,        // 10 minutos para escribir
            taskId: 'step6-biosensor'
        },
        {
            id: 7,
            title: 'Resumen',
            icon: 'fa-clipboard-list',
            hasTimer: false,  // PRUEBA: sin timer
            taskDuration: 0
        },
        {
            id: 8,
            title: 'Autoevaluación',
            icon: 'fa-question-circle',
            hasTimer: false,  // PRUEBA: sin timer
            taskDuration: 0
        }
    ],

    // Tiempo mínimo en cada paso (en segundos) - 0 = sin restricción
    MIN_TIME_PER_STEP: 0
};

// Estado global de la aplicación
const APP_STATE = {
    currentStudent: null,
    isOnlineMode: false,
    currentStep: 1,
    totalSteps: CONFIG.STEPS.length,
    stepTimerCompleted: {},
    quizAlreadyTaken: false
};
