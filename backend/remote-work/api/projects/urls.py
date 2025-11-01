from django.urls import path
from .views import ProjectCreate, AcceptInvitation, searchuser

urlpatterns = [
    path('create/', ProjectCreate.as_view(), name='project_create'),
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('userSearch/', searchuser.as_view(), name='user_search'),
]