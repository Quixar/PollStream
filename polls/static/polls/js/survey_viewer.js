document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const dataEl = document.getElementById('survey-data');
    if (!dataEl) return;

    const surveyState = JSON.parse(dataEl.textContent);
    const container = document.getElementById('survey-content');
    const form = document.getElementById('survey-form');

    if (!surveyState.pages || surveyState.pages.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-10">В этой анкете пока нет вопросов.</p>';
        return;
    }

    // Вспомогательная функция для экранирования HTML
    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Рендеринг вопросов
    surveyState.pages.forEach(page => {
        page.questions.forEach((q) => {
            const qDiv = document.createElement('div');
            qDiv.className = "bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6";

            let html = `<label class="block text-xl font-bold text-gray-900 mb-4">
                            ${esc(q.title)}
                            ${q.required ? '<span class="text-red-500 ml-1">*</span>' : ''}
                        </label>`;

            const name = `q_${q.id}`;

            // Логика выбора типа поля
            switch (q.type) {
                case 'text':
                case 'email':
                case 'number':
                case 'date':
                    html += `<input type="${q.type}" name="${name}" 
                               class="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                               ${q.required ? 'required' : ''} placeholder="Ваш ответ...">`;
                    break;

                case 'single_choice':
                case 'multiple_choice':
                    const inputType = (q.type === 'single_choice') ? 'radio' : 'checkbox';
                    (q.options || []).forEach(opt => {
                        html += `
                            <label class="flex items-center gap-3 mb-3 cursor-pointer p-4 border border-gray-100 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition group">
                                <input type="${inputType}" name="${name}" value="${esc(opt)}" 
                                       class="w-5 h-5 text-indigo-600 focus:ring-indigo-500" ${q.required ? 'required' : ''}>
                                <span class="text-gray-700 group-hover:text-indigo-900 transition">${esc(opt)}</span>
                            </label>`;
                    });
                    break;

                case 'dropdown':
                    html += `<select name="${name}" class="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none" ${q.required ? 'required' : ''}>
                                <option value="">Выберите вариант...</option>
                                ${(q.options || []).map(opt => `<option value="${esc(opt)}">${esc(opt)}</option>`).join('')}
                             </select>`;
                    break;

                case 'matrix':
                    html += `<div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr><th></th>`;
                    q.cols.forEach(col => html += `<th class="p-2 text-center text-sm font-medium text-gray-500">${esc(col)}</th>`);
                    html += `</tr></thead><tbody>`;
                    q.rows.forEach(row => {
                        html += `<tr class="border-t border-gray-50"><td class="py-4 font-medium text-gray-700">${esc(row)}</td>`;
                        q.cols.forEach(col => {
                            html += `<td class="text-center p-2">
                                        <input type="radio" name="${name}_${esc(row)}" value="${esc(col)}" ${q.required ? 'required' : ''} class="w-4 h-4 text-indigo-600">
                                     </td>`;
                        });
                        html += `</tr>`;
                    });
                    html += `</tbody></table></div>`;
                    break;
            }

            qDiv.innerHTML = html;
            container.appendChild(qDiv);
        });
    });

    // Обработка отправки формы
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = "Отправка...";

            const formData = new FormData(form);
            const answers = {};

            for (let [key, value] of formData.entries()) {
                const questionId = key.replace('q_', '');
                if (answers[questionId]) {
                    if (!Array.isArray(answers[questionId])) answers[questionId] = [answers[questionId]];
                    answers[questionId].push(value);
                } else {
                    answers[questionId] = value;
                }
            }

            const pathParts = window.location.pathname.split('/');
            const surveyId = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];

            try {
                const response = await fetch(`/survey/${surveyId}/submit/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Получаем CSRF токен из куки или из скрытого поля формы
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || getCookie('csrftoken')
                    },
                    body: JSON.stringify({ answers: answers })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    container.innerHTML = `
                        <div class="text-center py-10">
                            <h2 class="text-2xl font-bold text-green-600 mb-4">Спасибо за ваш ответ!</h2>
                            <p class="text-gray-600">Ваши данные успешно сохранены.</p>
                            <a href="/" class="mt-6 inline-block text-indigo-600 hover:underline">На главную</a>
                        </div>
                    `;
                    submitBtn.remove();
                } else {
                    throw new Error(result.message);
                }
            } catch (err) {
                alert("Ошибка при отправке: " + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = "Отправить анкету";
            }
        };

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
    }
});