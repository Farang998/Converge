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
from mongoengine.queryset.visitor import Q
from .utils import send_otp_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.core.cache import cache
import secrets
import firebase_admin
from firebase_admin import auth as firebase_auth


def _get_authenticated_user(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None, Response({'error': 'Authorization token is required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        token_type, token = auth_header.split(' ')
        if token_type.lower() != 'bearer':
            return None, Response({'error': 'Invalid token type'}, status=status.HTTP_401_UNAUTHORIZED)
    except ValueError:
        return None, Response({'error': 'Invalid authorization'}, status=status.HTTP_401_UNAUTHORIZED)

    user = User.validate_token(token)
    if not user:
        return None, Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)
    return user, None


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
        first_name = request.data.get('firstName')
        last_name = request.data.get('lastName')

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
            User.create_user(username=username, email=email, password=password, firstName=first_name, lastName=last_name)
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
            send_otp_email(email, purpose)
            return JsonResponse({'success': True, 'message': 'OTP sent successfully.'})
        return JsonResponse({'success': False, 'message': 'Email is required.'})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@csrf_exempt
def validate_otp(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method.'})

    try:
        data = json.loads(request.body.decode('utf-8')) if request.body else request.POST
    except Exception:
        data = request.POST

    email = data.get('email')
    otp = data.get('otp')
    purpose = data.get('purpose')

    if not all([email, otp, purpose]):
        return JsonResponse({'success': False, 'message': 'Email, OTP, and purpose are required.'})

    otp_record = EmailOTP.objects(user=email, purpose=purpose, is_used=False).first()
    if not otp_record:
        return JsonResponse({'success': False, 'message': 'No OTP found for this email and purpose. Please request a new one.'})

    if otp_record.otp != str(otp):
        return JsonResponse({'success': False, 'message': 'Invalid OTP.'})

    otp_record.is_used = True
    otp_record.save()
    return JsonResponse({'success': True, 'message': 'OTP validated successfully.'})

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
        except Exception:
            return Response({'error': 'Failed to send OTP.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResetPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        new_password = request.data.get('new_password')

        if not email or not new_password:
            return Response({'error': 'Email and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects(user=email, purpose='password_reset', is_used=True).first()

        if not otp_record:
            return Response({'error': 'No OTP found or OTP expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects(email=email).first()
        if not user:
            return Response({'error': 'No user found for this email.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user.password = make_password(new_password)
            user.save()
            otp_record.is_used = True  
            otp_record.save()
            return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IdentifyUserView(APIView):
    def get(self, request):
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        date_joined = getattr(user, 'date_joined', None)
        first_name = getattr(user, 'firstName', '')
        last_name = getattr(user, 'lastName', '')

        return Response({
            'message': 'User identified successfully',
            'user': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': first_name,
                'last_name': last_name,
                'date_joined': date_joined.isoformat() if date_joined else None,
            }
        }, status=status.HTTP_200_OK)
    
class UserListView(APIView):
    def get(self, request):
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        query = request.query_params.get('q', '').strip()
        try:
            limit = int(request.query_params.get('limit', 25))
        except (TypeError, ValueError):
            limit = 25
        limit = max(1, min(limit, 100))

        users_qs = User.objects
        if query:
            users_qs = users_qs.filter(
                Q(username__icontains=query) |
                Q(email__icontains=query) |
                Q(firstName__icontains=query) |
                Q(lastName__icontains=query)
            )

        users_qs = users_qs.order_by('username')
        users = users_qs[:limit]

        data = [{
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'first_name': getattr(u, 'firstName', ''),
            'last_name': getattr(u, 'lastName', '')
        } for u in users]

        return Response({'users': data}, status=status.HTTP_200_OK)

class UserByUsernameView(APIView):
    def get(self, request):
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        username = request.query_params.get('username', '').strip()
        if not username:
            return Response({'error': 'Username parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_obj = User.objects(username=username).first()
            if not user_obj:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

            data = {
                'id': str(user_obj.id),
                'username': user_obj.username,
                'email': user_obj.email,
                'first_name': getattr(user_obj, 'firstName', ''),
                'last_name': getattr(user_obj, 'lastName', '')
            }
            return Response({'user': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Server error: ' + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GoogleAuthView(APIView):
    """Authenticate a user via Google/Firebase ID token."""
    
    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'error': 'id_token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Initialize Firebase app once (idempotent)
            if not firebase_admin._apps:
                firebase_admin.initialize_app()

            # Verify the Firebase ID token
            decoded_token = firebase_auth.verify_id_token(id_token)
            email = decoded_token.get('email')

            if not email:
                return Response({'error': 'Email not found in token'}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects(email=email).first()
            if not user:
                user = User.create_user(username=email.split('@')[0], email=email, password=secrets.token_urlsafe())

            token = User.generate_token(user.id)
            return Response({'message': 'Login successful', 'token': token}, status=status.HTTP_200_OK)
        except firebase_auth.InvalidIdTokenError:
            return Response({'error': 'Invalid ID token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        data = request.data
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip()

        if email:
            try:
                validate_email(email)
            except DjangoValidationError:
                return Response({'error': 'Invalid email address'}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects(email=email).exclude(id=user.id).first():
                return Response({'error': 'Email already in use by another account'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user.firstName = first_name or user.firstName
            user.lastName = last_name or user.lastName
            user.email = email or user.email
            user.save()

            return Response({
                'message': 'Profile updated successfully',
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.firstName,
                    'last_name': user.lastName
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Failed to update profile: ' + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)