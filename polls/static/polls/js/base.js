document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('user-menu-button');
    const dropdown = document.getElementById('user-dropdown');

    if (!button || !dropdown) return;

    let hoverTimeout;

    function openDropdown() {
        clearTimeout(hoverTimeout);
        dropdown.classList.remove('hidden');
    }

    function closeDropdown() {
        hoverTimeout = setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 150); 
    }

    button.addEventListener('mouseenter', openDropdown);
    dropdown.addEventListener('mouseenter', openDropdown);

    button.addEventListener('mouseleave', closeDropdown);
    dropdown.addEventListener('mouseleave', closeDropdown);

    // --- Click ---
    button.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    // --- Click outside ---
    document.addEventListener('click', function (e) {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
});

// Получаем CSRF cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i=0; i<cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length +1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length+1));
                break;
            }
        }
    }
    return cookieValue;
}

// Удаление опроса - глобальная функция для всех страниц
window.deleteSurvey = function(id) {
    console.log('=== deleteSurvey START ===');
    console.log('Survey ID:', id);
    
    if (!confirm("Вы точно хотите удалить этот опрос? Это действие необратимо!")) {
        console.log('Deletion cancelled by user');
        return;
    }

    const csrfToken = getCookie("csrftoken");
    console.log('CSRF Token found:', !!csrfToken);
    
    if (!csrfToken) {
        alert("Ошибка: CSRF токен не найден. Перезагрузите страницу.");
        return;
    }

    const deleteUrl = `/delete-survey/${id}/`;
    console.log('Fetch URL:', deleteUrl);
    console.log('Fetch method: POST');

    fetch(deleteUrl, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({})
    })
    .then(res => {
        console.log('Response received');
        console.log('Status:', res.status, res.statusText);
        console.log('Content-Type:', res.headers.get('content-type'));
        
        if (res.headers.get('content-type')?.includes('application/json')) {
            return res.json().then(data => ({ 
                ok: res.ok, 
                status: res.status, 
                data: data 
            }));
        } else {
            return res.text().then(text => ({
                ok: res.ok,
                status: res.status,
                data: { message: text }
            }));
        }
    })
    .then(({ ok, status, data }) => {
        console.log('Parsed response:', { ok, status, data });
        
        if (status === 403) {
            alert("❌ Ошибка прав: " + (data.message || "У вас нет прав на удаление"));
            return;
        }
        
        if (status === 404) {
            alert("❌ Ошибка: Опрос не найден в БД");
            return;
        }
        
        if (status === 500) {
            alert("❌ Ошибка сервера: " + (data.message || "Что-то пошло не так"));
            console.error('Server error:', data);
            return;
        }
        
        if (ok && data.status === "success") {
            console.log('✓ Deletion successful');
            alert("✓ " + (data.message || "Опрос успешно удалён"));
            
            // Удаляем карточку из DOM
            const el = document.getElementById(`survey-${id}`);
            console.log('DOM element found:', !!el);
            
            if (el) {
                console.log('Removing element from DOM');
                el.remove();
                console.log('Element removed');
            }
            
            // Перезагружаем через 1 секунду чтобы услышать БД
            setTimeout(() => {
                console.log('Reloading page to sync with DB');
                location.reload();
            }, 1000);
        } else {
            alert("❌ Ошибка: " + (data.message || "Неизвестная ошибка при удалении"));
            console.log('Deletion failed - status not success');
        }
    })
    .catch(err => {
        console.error('=== FETCH ERROR ===');
        console.error('Error type:', err.name);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        alert("❌ Ошибка подключения: " + err.message);
    })
    .finally(() => {
        console.log('=== deleteSurvey END ===');
    });
};