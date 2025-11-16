from django.urls import path
from .views import RegisterUserView, LoginUserView, LogoutUserView, send_otp, validate_otp, validate_user, ForgotPasswordRequestView, ResetPasswordView, IdentifyUserView, UserListView, UpdateProfileView, UserByUsernameView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('logout/', LogoutUserView.as_view(), name='logout'),
    path('send-otp/', send_otp, name='send_otp'),
    path('validate-otp/', validate_otp, name='validate_otp'),
    path('validate-user/', validate_user, name='validate_user'),
    path('forgot-password/request/', ForgotPasswordRequestView.as_view(), name='forgot_password_request'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('identify-user/', IdentifyUserView.as_view(), name='identify_user'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/by-username/', UserByUsernameView.as_view(), name='user_by_username'),
    path('profile/', UpdateProfileView.as_view(), name='update_profile'),
    path('google-login/', LoginUserView.as_view(), name='google_login'),
]