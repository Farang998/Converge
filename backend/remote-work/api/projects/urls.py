from django.urls import path, include
from .views import AcceptInvitation, ProjectViewSet, searchuser
from rest_framework.routers import DefaultRouter
from .dashboard_views import ProjectDashboardView, ProjectWorkflowView
router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')
urlpatterns = [
    # path('create/', ProjectCreate.as_view(), name='project_create'), <-- THIS LINE IS REMOVED
    path('accept-invitation/<str:project_id>/', AcceptInvitation.as_view(), name='accept_invitation'),
    path('userSearch/', searchuser.as_view(), name='user_search'),
    path('dashboard/<str:project_id>/overview/', ProjectDashboardView.as_view(), name='project_dashboard_overview'),
    path('dashboard/<str:project_id>/workflow/', ProjectWorkflowView.as_view(), name='project_workflow_overview'), 
    path('', include(router.urls)),
]