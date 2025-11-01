from django.urls import path
from .views import ProjectCreate, AcceptInvitation, CreateTask

urlpatterns = [
    path('create/', ProjectCreate.as_view(), name='project_create'),
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('task/create/', CreateTask.as_view(), name='task_create'),
]