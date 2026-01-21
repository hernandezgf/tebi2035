// ============================================
// SISTEMA DE QUIZ/AUTOEVALUACIÓN - TEBI 2035
// ============================================

/**
 * Verifica si el quiz ya fue completado
 */
function checkIfQuizTaken() {
    const localQuiz = JSON.parse(localStorage.getItem(`quiz_${CONFIG.MODULE_ID}`) || '{}');
    const totalQuestions = document.querySelectorAll('.quiz-question').length;
    let answeredCount = 0;

    for (let i = 1; i <= totalQuestions; i++) {
        if (localQuiz[`q${i}`]) {
            answeredCount++;
        }
    }

    return answeredCount === totalQuestions;
}

/**
 * Bloquea el quiz si ya fue completado
 */
function lockQuiz() {
    APP_STATE.quizAlreadyTaken = true;
    const localQuiz = JSON.parse(localStorage.getItem(`quiz_${CONFIG.MODULE_ID}`) || '{}');

    // Mostrar mensaje de quiz completado
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) return;

    const lockedMessage = document.createElement('div');
    lockedMessage.className = 'bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6';
    lockedMessage.innerHTML = `
        <div class="flex items-center">
            <div class="text-amber-500 text-3xl mr-4"><i class="fas fa-lock"></i></div>
            <div>
                <h4 class="font-semibold text-amber-800">Autoevaluación Completada</h4>
                <p class="text-amber-700 text-sm">Ya completaste esta autoevaluación. Solo se permite un intento.</p>
            </div>
        </div>
    `;
    quizContainer.insertBefore(lockedMessage, quizContainer.firstChild);

    // Bloquear todas las preguntas y mostrar respuestas
    document.querySelectorAll('.quiz-question').forEach(question => {
        const questionNum = question.dataset.question;
        const savedAnswer = localQuiz[`q${questionNum}`];

        question.classList.add('answered');
        const options = question.querySelectorAll('.quiz-option');
        const feedback = question.querySelector('.quiz-feedback');

        options.forEach(opt => {
            opt.style.pointerEvents = 'none';
            opt.classList.add('opacity-60');

            if (opt.dataset.correct === 'true') {
                opt.classList.add('correct');
                opt.classList.remove('opacity-60');
            }

            if (savedAnswer && opt.textContent.trim() === savedAnswer.answer) {
                opt.classList.add('selected');
                opt.classList.remove('opacity-60');
                if (!savedAnswer.isCorrect) {
                    opt.classList.add('incorrect');
                }
            }
        });

        if (savedAnswer && feedback) {
            feedback.classList.remove('hidden');
            if (savedAnswer.isCorrect) {
                feedback.innerHTML = '<i class="fas fa-check-circle text-green-600 mr-2"></i><span class="text-green-700">Respondiste correctamente.</span>';
                feedback.classList.add('bg-green-50');
            } else {
                feedback.innerHTML = '<i class="fas fa-times-circle text-red-600 mr-2"></i><span class="text-red-700">Tu respuesta fue incorrecta. La correcta está en verde.</span>';
                feedback.classList.add('bg-red-50');
            }
        }
    });

    // Mostrar resultados
    showQuizResults(localQuiz);
}

/**
 * Muestra los resultados del quiz
 */
function showQuizResults(localQuiz) {
    const totalQuestions = document.querySelectorAll('.quiz-question').length;
    let correctCount = 0;

    for (let i = 1; i <= totalQuestions; i++) {
        if (localQuiz[`q${i}`] && localQuiz[`q${i}`].isCorrect) {
            correctCount++;
        }
    }

    const resultsDiv = document.getElementById('quiz-results');
    const scoreEl = document.getElementById('quiz-score');

    if (scoreEl) {
        scoreEl.textContent = `Obtuviste ${correctCount} de ${totalQuestions} respuestas correctas (${Math.round(correctCount / totalQuestions * 100)}%)`;
    }

    if (resultsDiv) {
        resultsDiv.classList.remove('hidden');
    }
}

/**
 * Verifica si se completaron todas las preguntas
 */
function checkQuizCompletion() {
    const totalQuestions = document.querySelectorAll('.quiz-question').length;
    const answeredQuestions = document.querySelectorAll('.quiz-question.answered').length;

    if (answeredQuestions === totalQuestions && !APP_STATE.quizAlreadyTaken) {
        const correctAnswers = document.querySelectorAll('.quiz-option.selected[data-correct="true"]').length;
        const resultsDiv = document.getElementById('quiz-results');
        const scoreEl = document.getElementById('quiz-score');

        if (scoreEl) {
            scoreEl.textContent = `Obtuviste ${correctAnswers} de ${totalQuestions} respuestas correctas (${Math.round(correctAnswers / totalQuestions * 100)}%)`;
        }

        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }

        // Marcar quiz como completado
        APP_STATE.quizAlreadyTaken = true;
        const localQuiz = JSON.parse(localStorage.getItem(`quiz_${CONFIG.MODULE_ID}`) || '{}');
        localQuiz.completed = true;
        localQuiz.completedAt = new Date().toISOString();
        localQuiz.score = correctAnswers;
        localQuiz.total = totalQuestions;
        localStorage.setItem(`quiz_${CONFIG.MODULE_ID}`, JSON.stringify(localQuiz));
    }
}

/**
 * Inicializa los event listeners del quiz
 */
function initQuizListeners() {
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function () {
            const question = this.closest('.quiz-question');
            if (!question || question.classList.contains('answered')) return;

            question.classList.add('answered');
            const questionNum = question.dataset.question;
            const options = question.querySelectorAll('.quiz-option');
            const feedback = question.querySelector('.quiz-feedback');
            const isCorrect = this.dataset.correct === 'true';
            const answerText = this.textContent.trim();

            options.forEach(opt => {
                opt.classList.remove('hover:bg-gray-50');
                if (opt.dataset.correct === 'true') {
                    opt.classList.add('correct');
                }
            });

            this.classList.add('selected');

            // Guardar respuesta
            saveQuizAnswer(questionNum, answerText, isCorrect);

            if (feedback) {
                if (isCorrect) {
                    feedback.innerHTML = '<i class="fas fa-check-circle text-green-600 mr-2"></i><span class="text-green-700">¡Correcto! Excelente trabajo.</span>';
                    feedback.classList.add('bg-green-50');
                } else {
                    this.classList.add('incorrect');
                    feedback.innerHTML = '<i class="fas fa-times-circle text-red-600 mr-2"></i><span class="text-red-700">Incorrecto. Revisa la respuesta correcta en verde.</span>';
                    feedback.classList.add('bg-red-50');
                }
                feedback.classList.remove('hidden');
            }

            checkQuizCompletion();
        });
    });
}
