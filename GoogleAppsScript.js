// ============================================
// GOOGLE APPS SCRIPT - TEBI 2035 (ACTUALIZADO)
// ============================================
// INSTRUCCIONES:
// 1. En tu Google Sheet, ve a: Extensiones > Apps Script
// 2. Borra todo el codigo existente
// 3. Pega este codigo completo
// 4. Guarda (Ctrl+S)
// 5. Implementar > Nueva implementacion > Aplicacion web
// 6. Ejecutar como: "Yo" | Acceso: "Cualquier usuario"
// 7. Copia la URL generada y pegala en el HTML
//
// IMPORTANTE: Este script incluye soporte para TAREAS ESCRITAS
// Asegurate de crear la pestana "Tareas" en tu Google Sheet
// ============================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  // Verificamos que existan parámetros para evitar errores de 'undefined'
  if (!e || !e.parameter) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'No se recibieron parámetros' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const action = e.parameter.action;
    const studentId = e.parameter.studentId;
    let result = { success: false, error: 'Acción no válida' };

    if (action === 'verify') {
      result = verifyStudent(studentId);
    } else if (action === 'getProgress') {
      const moduleId = e.parameter.moduleId;
      result = getProgress(studentId, moduleId);
    } else if (action === 'getTask') {
      const moduleId = e.parameter.moduleId;
      const taskId = e.parameter.taskId;
      result = getTaskResponse(studentId, moduleId, taskId);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'saveProgress') {
      saveProgress(data);
    } else if (action === 'saveQuizAnswer') {
      saveQuizAnswer(data);
    } else if (action === 'saveTaskResponse') {
      saveTaskResponse(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function verifyStudent(studentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Estudiantes');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toUpperCase() === studentId.toUpperCase()) {
      return {
        success: true,
        studentId: data[i][0],
        name: data[i][1],
        email: data[i][2]
      };
    }
  }

  return { success: false, error: 'Estudiante no encontrado' };
}

function getProgress(studentId, moduleId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Progreso');
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0].toString().toUpperCase() === studentId.toUpperCase() &&
        data[i][1] === moduleId) {
      return {
        success: true,
        progress: {
          currentStep: data[i][2],
          completedSteps: data[i][3] ? data[i][3].toString().split(',').map(Number) : [],
          timestamp: data[i][4]
        }
      };
    }
  }

  return { success: true, progress: null };
}

function saveProgress(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Progreso');
  const completedStepsStr = data.completedSteps ? data.completedSteps.join(',') : '';

  sheet.appendRow([
    data.studentId,
    data.moduleId,
    data.currentStep,
    completedStepsStr,
    data.timestamp
  ]);
}

function saveQuizAnswer(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respuestas');

  sheet.appendRow([
    data.studentId,
    data.moduleId,
    data.questionNum,
    data.answer,
    data.isCorrect,
    data.timestamp
  ]);
}

// ============================================
// FUNCIONES PARA TAREAS ESCRITAS
// ============================================

function saveTaskResponse(data) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tareas');

  // Si la hoja no existe, la creamos con encabezados
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Tareas');
    sheet.appendRow([
      'studentId',
      'moduleId',
      'taskId',
      'response',
      'charCount',
      'timedOut',
      'timestamp'
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Ajustar ancho de columna de respuesta
    sheet.setColumnWidth(4, 400);
  }

  sheet.appendRow([
    data.studentId,
    data.moduleId,
    data.taskId,
    data.response,
    data.charCount,
    data.timedOut ? 'Sí' : 'No',
    data.timestamp
  ]);
}

function getTaskResponse(studentId, moduleId, taskId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tareas');

  if (!sheet) {
    return { success: true, task: null };
  }

  const data = sheet.getDataRange().getValues();

  // Buscar la última respuesta del estudiante para esta tarea
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0].toString().toUpperCase() === studentId.toUpperCase() &&
        data[i][1] === moduleId &&
        data[i][2] === taskId) {
      return {
        success: true,
        task: {
          response: data[i][3],
          charCount: data[i][4],
          timedOut: data[i][5] === 'Sí',
          timestamp: data[i][6]
        }
      };
    }
  }

  return { success: true, task: null };
}

// ============================================
// FUNCIÓN PARA OBTENER RESUMEN DE UN ESTUDIANTE
// ============================================

function getStudentSummary(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Verificar estudiante
  const student = verifyStudent(studentId);
  if (!student.success) {
    return student;
  }

  // Obtener tareas
  const tasksSheet = ss.getSheetByName('Tareas');
  const tasks = [];
  if (tasksSheet) {
    const tasksData = tasksSheet.getDataRange().getValues();
    for (let i = 1; i < tasksData.length; i++) {
      if (tasksData[i][0].toString().toUpperCase() === studentId.toUpperCase()) {
        tasks.push({
          moduleId: tasksData[i][1],
          taskId: tasksData[i][2],
          response: tasksData[i][3],
          charCount: tasksData[i][4],
          timedOut: tasksData[i][5],
          timestamp: tasksData[i][6]
        });
      }
    }
  }

  // Obtener respuestas del quiz
  const quizSheet = ss.getSheetByName('Respuestas');
  const quizAnswers = [];
  if (quizSheet) {
    const quizData = quizSheet.getDataRange().getValues();
    for (let i = 1; i < quizData.length; i++) {
      if (quizData[i][0].toString().toUpperCase() === studentId.toUpperCase()) {
        quizAnswers.push({
          moduleId: quizData[i][1],
          questionNum: quizData[i][2],
          answer: quizData[i][3],
          isCorrect: quizData[i][4],
          timestamp: quizData[i][5]
        });
      }
    }
  }

  return {
    success: true,
    student: student,
    tasks: tasks,
    quizAnswers: quizAnswers
  };
}

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

function testVerifyStudent() {
  const result = verifyStudent('3005');
  Logger.log('Resultado: ' + JSON.stringify(result));
}

function testGetProgress() {
  const result = getProgress('3005', 'modulo1a');
  Logger.log('Progreso: ' + JSON.stringify(result));
}

function testSaveTask() {
  const testData = {
    studentId: 'TEST001',
    moduleId: 'modulo1a',
    taskId: 'step1',
    response: 'Esta es una respuesta de prueba para el diagrama del sistema de medida.',
    charCount: 70,
    timedOut: false,
    timestamp: new Date().toISOString()
  };
  saveTaskResponse(testData);
  Logger.log('Tarea guardada correctamente');
}

function testGetTask() {
  const result = getTaskResponse('TEST001', 'modulo1a', 'step1');
  Logger.log('Tarea: ' + JSON.stringify(result));
}
