from django.urls import path
from .views import hello_world, RegisterUserView, LoginUserView, LogoutUserView, send_otp, validate_otp

urlpatterns = [
    path('hello/', hello_world),
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('logout/', LogoutUserView.as_view(), name='logout'),
    path('send-otp/', send_otp, name='send_otp'),
    path('validate-otp/', validate_otp, name='validate_otp'),
]