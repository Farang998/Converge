from django.urls import path, include
from .views import AcceptInvitation, ProjectViewSet, searchuser, GitHubImportView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')
urlpatterns = [
    # path('create/', ProjectCreate.as_view(), name='project_create'), <-- THIS LINE IS REMOVED
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('userSearch/', searchuser.as_view(), name='user_search'),
    path('<str:project_id>/import-github/', GitHubImportView.as_view(), name='import_github'),
    path('', include(router.urls)),
]