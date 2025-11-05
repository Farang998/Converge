from django.urls import path
from .views import NotificationListView, MarkNotificationAsReadView

urlpatterns = [
    # GET /api/notifications/
    path('', NotificationListView.as_view(), name='notification_list'),
    
    # POST /api/notifications/mark-as-read/<notification_id>/
    path('mark-as-read/<str:notification_id>/', MarkNotificationAsReadView.as_view(), name='notification_mark_read'),
]