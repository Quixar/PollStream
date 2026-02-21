from django.shortcuts import render, redirect
from django.contrib import messages

import json
from uuid import uuid4


def _uid():
    return uuid4().hex


def get_survey_templates():
    """
    Простые шаблоны анкет (минимум 3), без ИИ.
    Структура вопросов совместима с survey_builder.js (state.pages[].questions[]).
    """
    return [
        {
            "id": "feedback_form",
            "title": "Feedback Form",
            "default_name": "Feedback Form",
            "pages": [
                {
                    "title": "Главная страница",
                    "questions": [
                        {"type": "text", "title": "Ваше имя", "required": True},
                        {"type": "email", "title": "Email", "required": True},
                        {"type": "single_choice", "title": "Оценка", "required": True, "options": ["1", "2", "3", "4", "5"]},
                        {"type": "text", "title": "Комментарий", "required": False},
                    ],
                }
            ],
        },
        {
            "id": "event_registration",
            "title": "Event Registration",
            "default_name": "Event Registration",
            "pages": [
                {
                    "title": "Регистрация",
                    "questions": [
                        {"type": "text", "title": "Имя", "required": True},
                        {"type": "email", "title": "Email", "required": True},
                        {"type": "single_choice", "title": "Вы будете участвовать?", "required": True, "options": ["Да", "Нет"]},
                    ],
                }
            ],
        },
        {
            "id": "simple_survey",
            "title": "Simple Survey",
            "default_name": "Simple Survey",
            "pages": [
                {
                    "title": "Опрос",
                    "questions": [
                        {"type": "single_choice", "title": "Какой вариант вы выбираете?", "required": True, "options": ["Вариант 1", "Вариант 2", "Вариант 3"]},
                    ],
                }
            ],
        },
    ]


def build_state_from_template(template_def):
    # Приводим к форме state, ожидаемой survey_builder.js
    pages = []
    for p in template_def.get("pages", []):
        page_id = _uid()
        questions = []
        for q in p.get("questions", []):
            qq = {
                "id": _uid(),
                "type": q.get("type", "text"),
                "title": q.get("title", "Новый вопрос"),
                "required": bool(q.get("required", False)),
            }
            if "options" in q:
                qq["options"] = list(q.get("options") or [])
            if "rows" in q:
                qq["rows"] = list(q.get("rows") or [])
            if "cols" in q:
                qq["cols"] = list(q.get("cols") or [])
            questions.append(qq)
        pages.append(
            {
                "id": page_id,
                "title": p.get("title") or "Главная страница",
                "questions": questions,
            }
        )

    current_page_id = pages[0]["id"] if pages else None
    return {"pages": pages, "currentPageId": current_page_id}

def index(request):
    if request.method == 'POST':
        survey_name = request.POST.get('survey_name', '')
        survey_type = request.POST.get('survey_type', 'custom')
        template_id = request.POST.get('template_id', '') if survey_type == 'template' else ''
        if survey_name:
            # Redirect to create survey page with name and type as query parameters
            from urllib.parse import urlencode
            payload = {'survey_name': survey_name, 'survey_type': survey_type}
            if template_id:
                payload['template_id'] = template_id
            params = urlencode(payload)
            return redirect(f'/create-survey/?{params}')
    context = {
        "survey_templates": get_survey_templates(),
    }
    return render(request, 'polls/index.html', context)

def create_survey(request):
    # Get survey name and type from GET parameters
    survey_name = request.GET.get('survey_name', 'Новый опрос')
    survey_type = request.GET.get('survey_type', 'custom')
    template_id = request.GET.get('template_id', '')

    template_state_json = ''
    if survey_type == 'template' and template_id:
        templates = {t["id"]: t for t in get_survey_templates()}
        tpl = templates.get(template_id)
        if tpl:
            state = build_state_from_template(tpl)
            template_state_json = json.dumps(state, ensure_ascii=False)
            # Если пользователь не указал имя (или оставил дефолт), подставим дефолт шаблона
            if not survey_name or survey_name == 'Новый опрос':
                survey_name = tpl.get("default_name") or survey_name
    
    context = {
        'survey_name': survey_name,
        'survey_type': survey_type,
        'template_id': template_id,
        'template_state_json': template_state_json,
    }
    return render(request, 'polls/create_survey.html', context)

def login_view(request):
    return render(request, 'polls/login.html')

def register_view(request):
    return render(request, 'polls/register.html')
