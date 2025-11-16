# api/projects/urls.py (UPDATED)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, AcceptInvitation

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')

urlpatterns = [
    path('create/', ProjectCreate.as_view(), name='project_create'),
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('userSearch/', searchuser.as_view(), name='user_search'),
    path('', include(router.urls)),
]
