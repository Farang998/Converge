import random
from django.core.mail import send_mail, get_connection
from django.conf import settings
from .models import EmailOTP
from django.utils import timezone
import smtplib
import socket

def generate_otp():
    return random.randint(100000, 999999)


def send_otp_email(email, purpose):
    otp = generate_otp()
    subject = 'Your OTP Code'
    message = f'Your OTP code is {otp}. Please use this to complete your verification.'


    # Save OTP to MongoDB with purpose
    EmailOTP.objects(user=email, purpose=purpose).delete()  # Remove any existing OTPs for the user and purpose
    otp_record = EmailOTP(user=email, otp=str(otp), purpose=purpose, created_at=timezone.now())
    otp_record.save()

    try:
        print("Sending OTP email...")
        print(email)
        send_mail(subject, message, settings.EMAIL_HOST_USER, [email])
    except (smtplib.SMTPException, ConnectionRefusedError, socket.error) as e:
        try:
            otp_record.delete()
        except Exception:
            pass
        raise
    return otp