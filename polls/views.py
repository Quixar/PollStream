from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import Survey, Profile
from .models import Survey, SurveyResponse, SurveyLink
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth import logout
from .forms import RegistrationForm
from django.contrib.auth.forms import UserCreationForm
from .forms import ProfileUpdateForm
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.http import JsonResponse


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


@require_POST
def submit_survey_response(request, survey_id):
    try:
        survey = get_object_or_404(Survey, id=survey_id)

        data = json.loads(request.body)
        answers = data.get('answers', {})

        if not answers:
            return JsonResponse({'status': 'error', 'message': 'Ответы не получены'}, status=400)

        response = SurveyResponse.objects.create(
            survey=survey,
            answers_json=answers
        )

        return JsonResponse({
            'status': 'success',
            'message': 'Ответ успешно сохранен!',
            'response_id': response.id
        })

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Невалидный JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

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

def save_survey(request):
    """
    AJAX endpoint for survey create/update.
    Returns JSON always (no redirects), so frontend fetch() can reliably parse it.
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

    try:
        survey_id = data.get('survey_id') or None
        survey_name = (data.get('survey_name') or '').strip()
        survey_type = (data.get('survey_type') or 'custom').strip() or 'custom'
        state_json = data.get('state_json', None)
        settings_payload = data.get('settings') if isinstance(data.get('settings'), dict) else None
        finalize = bool(data.get('finalize', False))

        if survey_id:
            survey = get_object_or_404(Survey, id=survey_id, author=request.user)
            if survey_name:
                survey.name = survey_name
            survey.survey_type = survey_type
            if state_json is not None:
                survey.state_json = state_json
            if settings_payload is not None:
                survey.description = settings_payload.get('description', survey.description)
                survey.visibility = settings_payload.get('visibility', survey.visibility)

                survey.response_type = settings_payload.get('response_type', survey.response_type)
                response_limit = settings_payload.get('response_limit', None)
                survey.response_limit = int(response_limit) if response_limit not in (None, '', False) else None

                response_deadline = settings_payload.get('response_deadline', None)
                if response_deadline in (None, '', False):
                    survey.response_deadline = None
                else:
                    # datetime-local comes as "YYYY-MM-DDTHH:MM"
                    survey.response_deadline = parse_datetime(str(response_deadline)) or survey.response_deadline

                survey.show_progress_bar = bool(settings_payload.get('show_progress_bar', survey.show_progress_bar))
                survey.show_question_numbers = bool(settings_payload.get('show_question_numbers', survey.show_question_numbers))
                survey.shuffle_questions = bool(settings_payload.get('shuffle_questions', survey.shuffle_questions))
                survey.allow_edit_after_submit = bool(settings_payload.get('allow_edit_after_submit', survey.allow_edit_after_submit))
                survey.is_active = bool(settings_payload.get('is_active', survey.is_active))

            if finalize:
                # Mark as ready (current model has only is_active as status-like flag)
                survey.is_active = True
            survey.save()
        else:
            survey = Survey.objects.create(
                author=request.user,
                name=survey_name,
                survey_type=survey_type,
                state_json=state_json if state_json is not None else {},
            )

        return JsonResponse({'status': 'success', 'survey_id': survey.id, 'finalized': finalize})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
@require_POST
def delete_survey(request, survey_id):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Delete request from user {request.user.id} for survey {survey_id}")
        
        # Получаем опрос
        try:
            survey = Survey.objects.get(id=survey_id)
        except Survey.DoesNotExist:
            logger.error(f"Survey {survey_id} not found")
            return JsonResponse({'status': 'error', 'message': 'Опрос не найден'}, status=404)
        
        # Проверяем права доступа
        if survey.author != request.user:
            logger.warning(f"User {request.user.id} tried to delete survey {survey_id} owned by {survey.author.id}")
            return JsonResponse({'status': 'error', 'message': 'У вас нет прав на удаление'}, status=403)
        
        survey_name = survey.name
        survey_id_for_log = survey.id
        
        # Удаляем все связанные объекты вручную для лучшей отладки
        logger.info(f"Deleting {survey.responses.count()} responses for survey {survey_id_for_log}")
        survey.responses.all().delete()
        
        logger.info(f"Deleting {survey.links.count()} links for survey {survey_id_for_log}")
        survey.links.all().delete()
        
        # Удаляем сам опрос
        logger.info(f"Deleting survey {survey_id_for_log}: {survey_name}")
        survey.delete()
        
        logger.info(f"Successfully deleted survey {survey_id_for_log}: {survey_name}")
        
        return JsonResponse({
            'status': 'success',
            'message': f'Опрос "{survey_name}" успешно удалён из базы данных',
            'survey_id': survey_id_for_log
        })
        
    except Exception as e:
        logger.exception(f"Unexpected error deleting survey {survey_id}")
        return JsonResponse({
            'status': 'error',
            'message': f'Ошибка при удалении: {str(e)}'
        }, status=500)


@login_required
@require_POST
def delete_survey_page(request, survey_id, page_id):
    """Удаляет страницу из опроса и обновляет БД"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Delete page request from user {request.user.id}: survey={survey_id}, page_id={page_id}")
        
        # Получаем опрос
        try:
            survey = Survey.objects.get(id=survey_id)
        except Survey.DoesNotExist:
            logger.error(f"Survey {survey_id} not found")
            return JsonResponse({'status': 'error', 'message': 'Опрос не найден'}, status=404)
        
        # Проверяем права доступа
        if survey.author != request.user:
            logger.warning(f"User {request.user.id} tried to delete page in survey {survey_id} owned by {survey.author.id}")
            return JsonResponse({'status': 'error', 'message': 'У вас нет прав'}, status=403)
        
        # Получаем текущее состояние опроса
        if not survey.state_json:
            logger.error(f"Survey {survey_id} has no state_json")
            return JsonResponse({'status': 'error', 'message': 'Состояние опроса не найдено'}, status=400)
        
        state = survey.state_json
        
        # Находим и удаляем страницу из состояния
        pages = state.get('pages', [])
        initial_count = len(pages)
        pages = [p for p in pages if p.get('id') != page_id]
        final_count = len(pages)
        
        if initial_count == final_count:
            logger.warning(f"Page {page_id} not found in survey {survey_id}")
            return JsonResponse({'status': 'error', 'message': 'Страница не найдена'}, status=404)
        
        logger.info(f"Found and removed page {page_id} from survey {survey_id}")
        
        # Если удалена текущая страница, переключаемся на первую (если она есть)
        current_page_id = state.get('currentPageId')
        if current_page_id == page_id:
            new_current_id = pages[0].get('id') if pages else None
            state['currentPageId'] = new_current_id
            logger.info(f"Current page was deleted, switched to: {new_current_id}")
        
        # Обновляем состояние
        state['pages'] = pages
        survey.state_json = state
        survey.save()
        
        logger.info(f"Successfully deleted page {page_id} from survey {survey_id} and saved to DB")
        
        return JsonResponse({
            'status': 'success',
            'message': 'Страница успешно удалена',
            'page_id': page_id,
            'current_page_id': state.get('currentPageId')
        })
        
    except Exception as e:
        logger.exception(f"Unexpected error deleting page {page_id} from survey {survey_id}")
        return JsonResponse({
            'status': 'error',
            'message': f'Ошибка при удалении страницы: {str(e)}'
        }, status=500)


@ensure_csrf_cookie
def edit_survey(request, survey_id):
    if not request.user.is_authenticated:
        return redirect('login')

    survey = get_object_or_404(Survey, id=survey_id, author=request.user)
    state_json_string = json.dumps(survey.state_json, ensure_ascii=False)
    context = {
        'survey_id': survey.id,
        'survey_name': survey.name,
        'survey_type': survey.survey_type,
        'template_state_json': state_json_string,
    }
    return render(request, 'polls/create_survey.html', context)

def survey_detail(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    # Check if user is author or has valid token
    token = request.GET.get('token')
    if survey.author != request.user and (not token or not SurveyLink.objects.filter(survey=survey, token=token, is_active=True).exists()):
        if not request.user.is_authenticated:
            return redirect('login')
        raise Http404("Survey not found")
    
    state_data = survey.state_json if survey.state_json else {"pages": []}
    context = {
        'survey': survey,
        'state_json': json.dumps(state_data, ensure_ascii=False),
        'is_author': survey.author == request.user,
    }
    return render(request, 'polls/survey_view.html', context)

@login_required
@ensure_csrf_cookie
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


@login_required
def dashboard_profile(request):
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == "POST":
        request.user.username = request.POST.get("username")
        request.user.email = request.POST.get("email")
        request.user.first_name = request.POST.get("first_name")
        request.user.last_name = request.POST.get("last_name")

        profile.phone = request.POST.get("phone")

        request.user.save()
        profile.save()

        return redirect("dashboard_profile")

    return render(request, "polls/dashboard_profile.html", {
        "profile": profile
    })


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


@login_required
@ensure_csrf_cookie
def survey_settings(request, survey_id):
    """Страница настроек опроса."""
    survey = get_object_or_404(Survey, id=survey_id, author=request.user)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Обновляем базовые настройки
            survey.name = data.get('name', survey.name)
            survey.description = data.get('description', survey.description)
            survey.visibility = data.get('visibility', survey.visibility)
            
            # Настройки ответов
            survey.response_type = data.get('response_type', survey.response_type)
            if data.get('response_limit'):
                survey.response_limit = int(data.get('response_limit'))
            else:
                survey.response_limit = None
                
            if data.get('response_deadline'):
                survey.response_deadline = data.get('response_deadline')
            else:
                survey.response_deadline = None
            
            # Прочие настройки
            survey.show_progress_bar = data.get('show_progress_bar', True)
            survey.show_question_numbers = data.get('show_question_numbers', True)
            survey.shuffle_questions = data.get('shuffle_questions', False)
            survey.allow_edit_after_submit = data.get('allow_edit_after_submit', False)
            survey.is_active = data.get('is_active', True)
            
            survey.save()
            return JsonResponse({'status': 'success', 'message': 'Настройки сохранены'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    context = {
        'survey': survey,
        'survey_json': json.dumps({
            'id': survey.id,
            'name': survey.name,
            'description': survey.description,
            'visibility': survey.visibility,
            'response_type': survey.response_type,
            'response_limit': survey.response_limit,
            'response_deadline': survey.response_deadline,
            'show_progress_bar': survey.show_progress_bar,
            'show_question_numbers': survey.show_question_numbers,
            'shuffle_questions': survey.shuffle_questions,
            'allow_edit_after_submit': survey.allow_edit_after_submit,
            'is_active': survey.is_active,
        }, ensure_ascii=False)
    }
    return render(request, 'polls/survey_settings.html', context)


@login_required
def survey_responses(request, survey_id):
    """Страница для управления ответами и распространением опроса."""
    survey = get_object_or_404(Survey, id=survey_id, author=request.user)
    
    # Генерируем или получаем ссылку
    survey_link, _ = SurveyLink.objects.get_or_create(
        survey=survey,
        defaults={'token': uuid4().hex}
    )
    
    responses = survey.responses.all().order_by('-submitted_at')
    
    context = {
        'survey': survey,
        'survey_link': survey_link,
        'response_count': responses.count(),
        'responses': responses[:10],  # Последние 10 ответов
        'response_json': json.dumps({
            'total': responses.count(),
            'responses': [
                {
                    'id': r.id,
                    'submitted_at': r.submitted_at.strftime('%d.%m.%Y %H:%M'),
                    'answers': r.answers_json
                } for r in responses[:10]
            ]
        }, ensure_ascii=False)
    }
    return render(request, 'polls/survey_responses.html', context)


@login_required
def survey_results(request, survey_id):
    """Страница с результатами опроса."""
    survey = get_object_or_404(Survey, id=survey_id, author=request.user)
    responses = survey.responses.all()
    
    # Анализ ответов
    response_count = responses.count()
    
    # Подготовка данных для графиков
    responses_by_date = {}
    for resp in responses:
        date = resp.submitted_at.date()
        date_str = date.strftime('%d.%m.%Y')
        responses_by_date[date_str] = responses_by_date.get(date_str, 0) + 1
    
    context = {
        'survey': survey,
        'response_count': response_count,
        'responses_by_date': json.dumps(responses_by_date, ensure_ascii=False),
        'responses': responses,
    }
    return render(request, 'polls/survey_results.html', context)
