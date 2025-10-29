from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import User, EmailOTP
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from mongoengine.errors import ValidationError as MongoValidationError
from .utils import send_otp_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.core.cache import cache


def contain_all_numbers(s):
    for i in s:
        if not i.isdigit():
            return False
    return True

class RegisterUserView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        firstName = request.data.get('firstName')
        lastName = request.data.get('lastName')

        if not username or not password or not email:
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(username, str) or not isinstance(password, str) or not isinstance(email, str):
            return Response({'error': 'Invalid data types'}, status=status.HTTP_400_BAD_REQUEST)
        
        if username.strip() == '' or password.strip() == '' or email.strip() == '':
            return Response({'error': 'Fields cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        if username[0].isdigit() or contain_all_numbers(username):
            return Response({'error': 'Username cannot start with a number or contain all numbers'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects(username=username).first():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects(email=email).first():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters long'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({'error': 'Invalid email address'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.create_user(username=username, email=email, password=password, firstName=firstName, lastName=lastName)
            return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)
        except MongoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Server error: ' + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginUserView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.authenticate(username=username, password=password, is_email=False)
        if user is None:
            user = User.authenticate(username, password, is_email=True)

        if user is not None:
            token = User.generate_token(user.id)
            return Response({'message': 'Login successful', 'token': token}, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutUserView(APIView):
    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        User.logout(token)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@csrf_exempt
def send_otp(request):
    if request.method == 'POST':
        try:
            if request.body:
                data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = request.POST
        email = data.get('email') or request.POST.get('email')
        purpose = data.get('purpose') or request.POST.get('purpose') or 'register'
        if email:
            otp = send_otp_email(email, purpose)
            return JsonResponse({'success': True, 'message': 'OTP sent successfully.'})
        return JsonResponse({'success': False, 'message': 'Email is required.'})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@csrf_exempt
def validate_otp(request):
    if request.method == 'POST':
        try:
            if request.body:
                data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = request.POST
        email = data.get('email') or request.POST.get('email')
        otp = data.get('otp') or request.POST.get('otp')
        purpose = data.get('purpose') or request.POST.get('purpose')

        if not email or not otp or not purpose:
            return JsonResponse({'success': False, 'message': 'Email, OTP, and purpose are required.'})

        otp_record = EmailOTP.objects(user=email, purpose=purpose, is_used=False).first()

        if not otp_record:
            return JsonResponse({'success': False, 'message': 'No OTP found for this email and purpose. Please request a new one.'})

        if otp_record.otp == str(otp):
            otp_record.is_used = True
        else:
            return JsonResponse({'success': False, 'message': 'Invalid OTP.'})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@api_view(['POST'])
def validate_user(request):
    username = request.data.get('username')
    email = request.data.get('email')

    if not username or not email:
        return Response({'success': False, 'message': 'Username and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects(username=username).first():
        return Response({'success': False, 'message': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects(email=email).first():
        return Response({'success': False, 'message': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'success': True, 'message': 'Username and email are available.'}, status=status.HTTP_200_OK)


class ForgotPasswordRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects(email=email).first()
        if not user:
            return Response({'error': 'No account found with this email.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            send_otp_email(email, purpose='password_reset')
            return Response({'message': 'OTP sent to email if account exists.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Failed to send OTP.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResetPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')

        if not email or not otp or not new_password:
            return Response({'error': 'Email, OTP and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects(user=email, purpose='password_reset', is_used=True).first()

        if not otp_record:
            all_otps = EmailOTP.objects(user=email, purpose='password_reset')
            return Response({'error': 'No OTP found or OTP expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp != str(otp):
            return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects(email=email).first()
        if not user:
            return Response({'error': 'No user found for this email.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user.password = make_password(new_password)
            user.save()
            otp_record.is_used = True  
            otp_record.save()
            return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Server error: ' + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IdentifyUserView(APIView):
    def get(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': 'Authorization token is required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token_type, token = auth_header.split(' ')
            if token_type.lower() != 'bearer':
                return Response({'error': 'Invalid token type'}, status=status.HTTP_401_UNAUTHORIZED)
        except ValueError:
            return Response({'error': 'Invalid authorization'}, status=status.HTTP_401_UNAUTHORIZED)

        user = User.validate_token(token)
        if not user:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({'message': 'User identified successfully', 'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email
        }}, status=status.HTTP_200_OK)