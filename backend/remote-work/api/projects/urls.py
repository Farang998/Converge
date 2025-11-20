from django.urls import path, include
from .views import AcceptInvitation, ProjectViewSet, searchuser
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')
urlpatterns = [
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('userSearch/', searchuser.as_view(), name='user_search'),
    path('', include(router.urls)),
]