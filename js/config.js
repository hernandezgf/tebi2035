// ============================================
// CONFIGURACIÓN DEL MÓDULO - TEBI 2035
// ============================================

const CONFIG = {
    // URL del Google Apps Script (reemplazar con tu URL)
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzGJLPyP7mltJ__i07uUtfT8jrbxQW_0q2vEXTahot_ZqQiuMaWV0_lPP70zZd39VrGHw/exec',

    // ID del módulo actual
    MODULE_ID: 'modulo1a',

    // Configuración de los pasos del módulo
    // hasTask: true = tiene tarea escrita con textarea
    // hasTimer: true = solo cronómetro (tiempo mínimo para avanzar)
    // taskDuration: tiempo en segundos
    STEPS: [
        {
            id: 1,
            title: 'Introducción',
            icon: 'fa-home',
            hasTask: true,
            taskDuration: 0,
            taskId: 'step1-diagrama'
        },
        {
            id: 2,
            title: 'Sistemas de Medición',
            icon: 'fa-microscope',
            hasTimer: true,
            taskDuration: 600  // 10 minutos
        },
        {
            id: 3,
            title: 'Escalas de Medición',
            icon: 'fa-layer-group',
            hasTimer: true,
            taskDuration: 300  // 5 minutos
        },
        {
            id: 4,
            title: 'Precisión y Exactitud',
            icon: 'fa-crosshairs',
            hasTimer: true,
            taskDuration: 900  // 15 minutos
        },
        {
            id: 5,
            title: 'Sensibilidad y SNR',
            icon: 'fa-search-plus',
            hasTimer: true,
            taskDuration: 300  // 5 minutos
        },
        {
            id: 6,
            title: 'Tipos de Error',
            icon: 'fa-exclamation-triangle',
            hasTimer: true,
            taskDuration: 300  // 5 minutos
        },
        {
            id: 7,
            title: 'Calibración',
            icon: 'fa-balance-scale-right',
            hasTimer: true,
            taskDuration: 300  // 5 minutos
        },
        {
            id: 8,
            title: 'Medición Directa/Indirecta',
            icon: 'fa-ruler',
            hasTimer: true,
            taskDuration: 300  // 5 minutos
        },
        {
            id: 9,
            title: 'Resumen',
            icon: 'fa-clipboard-list',
            hasTimer: true,
            taskDuration: 300  // 5 minutos
        },
        {
            id: 10,
            title: 'Autoevaluación',
            icon: 'fa-question-circle',
            hasTimer: true,
            taskDuration: 600  // 10 minutos
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
