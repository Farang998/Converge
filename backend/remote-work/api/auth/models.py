from django.db import models
from mongoengine import Document, StringField, EmailField, DateTimeField, BooleanField
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
import secrets

class EmailOTP(Document):
    user = StringField(required=True)
    otp = StringField(required=True)
    purpose = StringField(required=True, choices=['register', 'password_reset'])
    created_at = DateTimeField(default=timezone.now)
    is_used = BooleanField(default=False)  

    meta = {
        'collection': 'email_otps',
        'indexes': [
            {'fields': ['created_at'], 'expireAfterSeconds': 300}  
        ]
    }

class Token(Document):
    user = StringField(required=True)
    token = StringField(required=True, unique=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {'collection': 'tokens',
            'indexes': [
                # expire after 7 days (604800 seconds); adjust as desired
                {'fields': ['created_at'], 'expireAfterSeconds': 7 * 24 * 60 * 60}
            ]
    }

class User(Document):
    username = StringField(required=True, unique=True, max_length=150)
    email = EmailField(required=True, unique=True)
    firstName = StringField(required=True, max_length=30)
    lastName = StringField(required=True, max_length=30)
    password = StringField(required=True)
    date_joined = DateTimeField(default=timezone.now)
    

    meta = {'collection': 'users'}

    @classmethod
    def create_user(cls, username, email, password, firstName, lastName):
        user = cls(username=username, email=email)
        if firstName:
            user.firstName = firstName
        if lastName:
            user.lastName = lastName
        user.password = make_password(password)
        user.save()
        return user

    @classmethod
    def generate_token(cls, user_id):
        token = secrets.token_hex(16)
        Token(user=str(user_id), token=token).save()
        return token

    @classmethod
    def validate_token(cls, token):
        try:
            token_obj = Token.objects.get(token=token)
            return cls.objects.get(id=token_obj.user)
        except (Token.DoesNotExist, cls.DoesNotExist):
            return None

    @classmethod
    def logout(cls, token):
        Token.objects(token=token).delete() 

    @classmethod
    def authenticate(cls, username, password, is_email):
        try:
            if is_email:
                user = cls.objects.get(email=username)
            else:
                user = cls.objects.get(username=username)
            if check_password(password, user.password):
                return user
        except cls.DoesNotExist:
            pass
        return None