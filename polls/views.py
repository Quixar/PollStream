from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import Survey
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth import logout
from .forms import RegistrationForm
from django.contrib.auth.forms import UserCreationForm


import json
from uuid import uuid4


def _uid():
    return uuid4().hex


def get_survey_templates():
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

@login_required
def index(request):
    if request.method == 'POST':
        survey_name = request.POST.get('survey_name', '')
        survey_type = request.POST.get('survey_type', 'custom')
        template_id = request.POST.get('template_id', '') if survey_type == 'template' else ''

        if survey_name:
            from urllib.parse import urlencode
            payload = {'survey_name': survey_name, 'survey_type': survey_type}

            if template_id:
                payload['template_id'] = template_id

            params = urlencode(payload)
            return redirect(f'/create-survey/?{params}')

    surveys = Survey.objects.filter(author=request.user).order_by('-created_at')

    context = {
        "survey_templates": get_survey_templates(),
        "surveys": surveys,
    }

    return render(request, 'polls/index.html', context)

@login_required
def save_survey(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            survey_id = data.get('survey_id')

            if survey_id:
                survey = get_object_or_404(Survey, id=survey_id, author=request.user)
                survey.name = data.get('survey_name', survey.name)
                survey.state_json = data.get('state_json', survey.state_json)
                survey.save()
            else:
                survey = Survey.objects.create(
                    author=request.user,
                    name=data.get('survey_name', 'Новый опрос'),
                    survey_type=data.get('survey_type', 'custom'),
                    state_json=data.get('state_json', {})
                )

            return JsonResponse({'status': 'success', 'survey_id': survey.id})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})


@login_required
def edit_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id, author=request.user)
    state_json_string = json.dumps(survey.state_json, ensure_ascii=False)
    context = {
        'survey_id': survey.id,
        'survey_name': survey.name,
        'survey_type': survey.survey_type,
        'template_state_json': state_json_string,
    }
    return render(request, 'polls/create_survey.html', context)

@login_required
def survey_detail(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id, author=request.user)
    state_data = survey.state_json if survey.state_json else {"pages": []}
    context = {
        'survey': survey,
        'state_json': json.dumps(state_data, ensure_ascii=False),
    }
    return render(request, 'polls/survey_view.html', context)

@login_required
def create_survey(request):
    survey_name = request.GET.get('survey_name', 'Новый опрос')
    survey_type = request.GET.get('survey_type', 'custom')
    template_id = request.GET.get('template_id', '')

    template_state_json = '{}'
    if survey_type == 'template' and template_id:
        templates = {t["id"]: t for t in get_survey_templates()}
        tpl = templates.get(template_id)
        if tpl:
            state = build_state_from_template(tpl)
            template_state_json = json.dumps(state, ensure_ascii=False)
            survey_name = tpl.get("default_name", survey_name)

    context = {
        'survey_name': survey_name,
        'survey_type': survey_type,
        'template_state_json': template_state_json,
        'survey_id': '',  # empty for new survey
    }
    return render(request, 'polls/create_survey.html', context)

def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect("dashboard_home")
        else:
            messages.error(request, "Invalid username or password")

    return render(request, "polls/login.html")

def register_view(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("dashboard_home")
        else:
            messages.error(request, "Please fix the errors below")
    else:
        form = UserCreationForm()
    return render(request, "polls/register.html", {"form": form})

def logout_view(request):
    logout(request)
    return redirect("login")

@login_required
def profile(request):
    surveys_count = request.user.surveys.count()
    user_data = {
        'username': request.user.username,
        'email': request.user.email,
        'surveys_count': surveys_count
    }
    return render(request, 'polls/profile.html', {'user': user_data})

# Dashboard views
@login_required
def dashboard_home(request):
    surveys = request.user.surveys.all().order_by('-created_at')
    responses_count = sum(s.responses.count() for s in surveys)  # total answers
    # For simplicity, assume you don’t have team members yet
    team_count = 0

    context = {
        'surveys_count': surveys.count(),
        'responses_count': responses_count,
        'team_count': team_count,
        'recent_activity': [],  # optional for now
    }
    return render(request, 'polls/dashboard_home.html', context)


def dashboard_profile(request):
    return render(request, 'polls/dashboard_profile.html')


def dashboard_team(request):
    return render(request, 'polls/dashboard_team.html')


@login_required
def dashboard_forms(request):
    surveys = Survey.objects.filter(author=request.user).order_by('-created_at')

    return render(request, 'polls/dashboard_forms.html', {
        'surveys': surveys
    })


def dashboard_activity(request):
    return render(request, 'polls/dashboard_activity.html')


def dashboard_settings(request):
    return render(request, 'polls/dashboard_settings.html')