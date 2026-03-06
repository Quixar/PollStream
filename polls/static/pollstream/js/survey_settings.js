document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  const root = document.getElementById('survey-settings-root');
  if (!root) return;

  const surveyId = root.getAttribute('data-survey-id');
  if (!surveyId) return;

  const responseTypeSelect = document.getElementById('responseType');
  const responseLimitContainer = document.getElementById('responseLimitContainer');
  const responseDeadlineContainer = document.getElementById('responseDeadlineContainer');

  const saveSurveyBtn = document.getElementById('saveSurveyBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const nextToResponsesBtn = document.getElementById('nextToResponsesBtn');

  function updateResponseControls() {
    if (!responseTypeSelect || !responseLimitContainer || !responseDeadlineContainer) return;

    const v = responseTypeSelect.value;
    if (v === 'limited') {
      responseLimitContainer.style.display = 'block';
      responseDeadlineContainer.style.display = 'none';
    } else if (v === 'date_limit') {
      responseLimitContainer.style.display = 'none';
      responseDeadlineContainer.style.display = 'block';
    } else {
      responseLimitContainer.style.display = 'none';
      responseDeadlineContainer.style.display = 'none';
    }
  }

  if (responseTypeSelect) {
    responseTypeSelect.addEventListener('change', updateResponseControls);
    updateResponseControls();
  }

  async function saveSettings({ redirectTo } = {}) {
    if (!saveBtnText) return false;

    const originalText = saveBtnText.textContent;
    saveBtnText.textContent = 'Сохранение...';
    if (saveSurveyBtn) saveSurveyBtn.disabled = true;
    if (nextToResponsesBtn) nextToResponsesBtn.disabled = true;

    const settings = {
      description: document.getElementById('surveyDescription')?.value ?? '',
      visibility: document.getElementById('visibility')?.value ?? 'link',
      response_type: document.getElementById('responseType')?.value ?? 'unlimited',
      response_limit: document.getElementById('responseLimit')?.value ?? null,
      response_deadline: document.getElementById('responseDeadline')?.value ?? null,
      show_progress_bar: Boolean(document.getElementById('showProgressBar')?.checked),
      show_question_numbers: Boolean(document.getElementById('showQuestionNumbers')?.checked),
      shuffle_questions: Boolean(document.getElementById('shuffleQuestions')?.checked),
      allow_edit_after_submit: Boolean(document.getElementById('allowEditAfterSubmit')?.checked),
      is_active: Boolean(document.getElementById('isActive')?.checked),
    };

    const surveyName = document.getElementById('surveyName')?.value ?? '';

    try {
      const response = await fetch('/save-survey/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
        },
        body: JSON.stringify({
          survey_id: surveyId,
          survey_name: surveyName,
          settings,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result || result.status !== 'success') {
        const msg = result?.message || `Ошибка сохранения (HTTP ${response.status})`;
        alert(msg);
        saveBtnText.textContent = originalText;
        return false;
      }

      saveBtnText.textContent = 'Сохранено';
      setTimeout(() => {
        saveBtnText.textContent = originalText;
      }, 1200);

      if (redirectTo) window.location.href = redirectTo;
      return true;
    } catch (e) {
      alert('Ошибка при сохранении');
      saveBtnText.textContent = originalText;
      return false;
    } finally {
      if (saveSurveyBtn) saveSurveyBtn.disabled = false;
      if (nextToResponsesBtn) nextToResponsesBtn.disabled = false;
    }
  }

  if (saveSurveyBtn) {
    saveSurveyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      void saveSettings();
    });
  }

  if (nextToResponsesBtn) {
    nextToResponsesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      void saveSettings({ redirectTo: `/survey/${surveyId}/responses/` });
    });
  }
});

