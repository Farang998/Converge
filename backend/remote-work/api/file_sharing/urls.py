from django.urls import path
from .views import FileUploadView, FileListView, FileDownloadView, FileDeleteView, FileDownloadProxyView

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('project/<str:project_id>/', FileListView.as_view(), name='file-list'),
    path('download/<str:file_id>/', FileDownloadView.as_view(), name='file-download'),
    path('download-proxy/<str:file_id>/', FileDownloadProxyView.as_view(), name='file-download-proxy'),
    path('delete/<str:file_id>/', FileDeleteView.as_view(), name='file-delete'),
]

