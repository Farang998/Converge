from django.db import models
from mongoengine import Document, StringField, EmailField, DateTimeField
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
import secrets

# Create your models here.
class EmailOTP(Document):
    user = StringField(required=True)
    otp = StringField(required=True)
    purpose = StringField(required=True, choices=['register', 'password_reset'])
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'email_otps',
        'indexes': [
            {'fields': ['created_at'], 'expireAfterSeconds': 120}
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
    def authenticate(cls, username, password, is_email):
        try:
            if is_email:
                user = cls.objects.get(email=username)
            else:
                user = cls.objects.get(username=username)
            f = check_password(password, user.password)
            if f:
                return user
        except cls.DoesNotExist:
            pass
        return None
