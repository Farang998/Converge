# api/projects/utils.py
from django.core.mail import send_mail
from django.conf import settings
from ..auth.models import User

def send_invitation_email(email, project_name, project_id):
    """
    Sends a single project invitation email.
    """
    subject = f"Invitation to join project {project_name}"
    message = f"You have been invited to join the project '{project_name}'. Please click the link to accept: {settings.FRONTEND_URL}/accept-invitation/{project_id}"
    from_email = settings.EMAIL_HOST_USER
    if not from_email or from_email.strip() == "" or from_email == "your-email@gmail.com" or from_email == "noreply@converge.com":
        print(f"ERROR: EMAIL_HOST_USER is not set or is using placeholder value.")
        print(f"Please edit backend/remote-work/.env and replace 'your-email@gmail.com' with your actual Gmail address.")
        print(f"The Gmail address must match the account that the APP_PASSWORD belongs to.")
        print(f"Cannot send invitation email to {email}")
        return
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            fail_silently=False
        )
        print(f"Email sent successfully to {email}")
    except Exception as e:
        error_msg = str(e)
        print(f"Failed to send email to {email}")
        
        # Provide specific guidance for common Gmail errors
        if "535" in error_msg or "BadCredentials" in error_msg or "Username and Password not accepted" in error_msg:
            app_password = settings.EMAIL_HOST_PASSWORD
            app_password_len = len(app_password.replace(" ", ""))
            app_password_clean = app_password.replace(" ", "")
            
            print("=" * 70)
            print("GMAIL AUTHENTICATION ERROR - Possible Solutions:")
            print("=" * 70)
            print(f"Current Configuration:")
            print(f"  - Email: {from_email}")
            print(f"  - App Password Length: {app_password_len} characters (should be 16)")
            print(f"  - App Password (first 4 chars): {app_password_clean[:4]}...")
            print(f"  - App Password (last 4 chars): ...{app_password_clean[-4:] if len(app_password_clean) >= 4 else ''}")
            
            if app_password_len != 16:
                print(f"\n❌ CRITICAL: App Password is {app_password_len} characters, but Gmail requires exactly 16!")
            elif app_password == "your-16-char-app-password-here":
                print(f"\n❌ CRITICAL: App Password is still using placeholder value!")
                print(f"   Please update GMAIL_APP_PASSWORD in your .env file")
            else:
                print(f"\n⚠️  App Password length is correct (16 chars), but authentication still failed.")
                print(f"   This usually means:")
                print(f"   1. The app password doesn't match the Gmail account")
                print(f"   2. 2-Factor Authentication is not enabled")
                print(f"   3. The app password was revoked or expired")
                print(f"   4. There are spaces or special characters in the password")
            
            print(f"\nSteps to Fix:")
            print(f"STEP 1: Enable 2-Step Verification (REQUIRED FIRST):")
            print(f"  1. Go to: https://myaccount.google.com/security")
            print(f"  2. Sign in with: {from_email}")
            print(f"  3. Find '2-Step Verification' and click 'Get started'")
            print(f"  4. Follow the prompts to enable it (you'll need your phone)")
            print(f"  5. Wait a few minutes after enabling")
            print(f"")
            print(f"STEP 2: Generate App Password (AFTER 2-Step is enabled):")
            print(f"  1. Go to: https://myaccount.google.com/apppasswords")
            print(f"  2. Sign in with: {from_email}")
            print(f"  3. If you see 'App passwords' option, continue. If not, 2-Step isn't enabled yet.")
            print(f"  4. Click 'Select app' -> Choose 'Mail'")
            print(f"  5. Click 'Select device' -> Choose 'Other (Custom name)'")
            print(f"  6. Enter 'Converge App' as the name and click 'Generate'")
            print(f"  7. Copy the 16-character password (it will look like: xxxx xxxx xxxx xxxx)")
            print(f"  8. Remove ALL spaces and update in .env file:")
            print(f"     GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx")
            print(f"  9. Make sure there are NO quotes around the password in .env")
            print(f"  10. Restart the Django server")
            print(f"\nImportant Notes:")
            print(f"  - 2-Factor Authentication MUST be enabled on the Gmail account")
            print(f"  - The app password must match the Gmail account: {from_email}")
            print(f"  - App passwords are 16 characters with NO spaces")
            print(f"  - Check .env file is in: backend/remote-work/.env")
            print("=" * 70)
        else:
            print(f"Error details: {error_msg}")
        
        import traceback
        traceback.print_exc()

def send_invitations_background(team_members_invited, project_name, project_id):
    """
    Sends emails to a list of new members in a background thread.
    """
    for member_id in team_members_invited:
        try:
            user = User.objects.get(id=member_id)
            send_invitation_email(user.email, project_name, project_id)
        except User.DoesNotExist:
            pass