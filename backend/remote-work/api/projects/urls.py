from django.urls import path, include
from .views import ProjectCreate, AcceptInvitation, ProjectViewSet, searchuser
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
urlpatterns = [
    path('', include(router.urls)),
    path('create/', ProjectCreate.as_view(), name='project_create'),
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('userSearch/', searchuser.as_view(), name='user_search'),
]