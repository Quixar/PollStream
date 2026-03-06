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

  const root = document.getElementById('survey-results-root');
  if (!root) return;

  const surveyId = root.getAttribute('data-survey-id');

  // Chart
  const canvas = document.getElementById('responesChart');
  const byDateRaw = root.getAttribute('data-responses-by-date') || '{}';
  let responsesByDate = {};
  try {
    responsesByDate = JSON.parse(byDateRaw);
  } catch (e) {
    responsesByDate = {};
  }

  if (canvas && typeof Chart !== 'undefined' && responsesByDate && Object.keys(responsesByDate).length > 0) {
    try {
      // eslint-disable-next-line no-new
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: Object.keys(responsesByDate),
          datasets: [{
            label: 'Количество ответов',
            data: Object.values(responsesByDate),
            backgroundColor: '#4F46E5',
            borderColor: '#4F46E5',
            borderWidth: 1,
            borderRadius: 8,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              labels: { boxWidth: 15, padding: 15, font: { size: 12, weight: 'bold' } },
            },
          },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    } catch (e) {
      // ignore chart errors in older browsers
    }
  }

  // Toggle details (no inline onclick)
  const table = document.getElementById('responsesTable');
  if (table) {
    table.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-response-id]');
      if (!row) return;
      const id = row.getAttribute('data-response-id');
      if (!id) return;
      const detailsRow = document.getElementById(`details-${id}`);
      if (detailsRow) detailsRow.classList.toggle('hidden');
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const rows = document.querySelectorAll('tr[data-response-id]');
      let csv = 'Дата и время,Ответы\n';
      rows.forEach((r) => {
        const submitted = r.getAttribute('data-submitted-at') || '';
        const answers = r.getAttribute('data-answers') || '';
        csv += `"${submitted.replaceAll('"', '""')}","${answers.replaceAll('"', '""')}"\n`;
      });

      const link = document.createElement('a');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      link.href = URL.createObjectURL(blob);
      link.download = `survey-results-${surveyId || 'export'}.csv`;
      link.click();
    });
  }

  // Finish
  const finishBtn = document.getElementById('finishBtn');
  const toast = document.getElementById('surveyReadyToast');
  if (finishBtn && surveyId) {
    finishBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      finishBtn.disabled = true;

      try {
        const resp = await fetch('/save-survey/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || '',
          },
          body: JSON.stringify({
            survey_id: surveyId,
            finalize: true,
          }),
        });

        const result = await resp.json().catch(() => null);
        if (!resp.ok || !result || result.status !== 'success') {
          const msg = result?.message || `Ошибка завершения (HTTP ${resp.status})`;
          alert(msg);
          finishBtn.disabled = false;
          return;
        }

        if (toast) toast.classList.remove('hidden');
        setTimeout(() => {
          window.location.href = '/dashboard/forms/';
        }, 900);
      } catch (err) {
        alert('Ошибка завершения');
        finishBtn.disabled = false;
      }
    });
  }
});

