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
            const formData = new FormData(form);
            const answers = {};

            for (let [key, value] of formData.entries()) {
                if (answers[key]) {
                    if (!Array.isArray(answers[key])) answers[key] = [answers[key]];
                    answers[key].push(value);
                } else {
                    answers[key] = value;
                }
            }

            console.log("Результаты опроса:", answers);
            alert("Ваши ответы приняты! Спасибо.");
            // Здесь в будущем будет fetch('/submit-answer/')
        };
    }
});