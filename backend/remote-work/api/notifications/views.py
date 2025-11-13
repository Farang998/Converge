
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..auth.models import User
from .models import Notification

from mongoengine.errors import DoesNotExist, ValidationError

# Re-using the same error constants for consistency
ERROR_AUTH_HEADER_MISSING = 'Authorization header missing'
ERROR_INVALID_AUTH_HEADER = 'Invalid authorization header format'
ERROR_INVALID_TOKEN = 'Invalid or expired token'


def _authenticate_user(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None, Response({'error': ERROR_AUTH_HEADER_MISSING}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        token = auth_header.split(' ')[1]
    except IndexError:
        return None, Response({'error': ERROR_INVALID_AUTH_HEADER}, status=status.HTTP_401_UNAUTHORIZED)

    user = User.validate_token(token)
    if not user:
        return None, Response({'error': ERROR_INVALID_TOKEN}, status=status.HTTP_401_UNAUTHORIZED)
    return user, None


class NotificationListView(APIView):
    """
    Handles fetching and managing user notifications.
    """
    
    def get(self, request):
        """
        Gets all unread notifications for the authenticated user.
        """
        user, error_response = _authenticate_user(request)
        if error_response:
            return error_response

        notifications = Notification.objects(user=user, read=False)
        data = [notification.to_json() for notification in notifications]
        
        return Response(data, status=status.HTTP_200_OK)


class MarkNotificationAsReadView(APIView):
    """
    Marks a specific notification as read.
    """
    
    def post(self, request, notification_id):
        """
        Sets the 'read' flag of a notification to True.
        """
        user, error_response = _authenticate_user(request)
        if error_response:
            return error_response

        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            
        except (DoesNotExist, ValidationError):
            return Response({'error': 'Notification not found or you do not have permission.'}, status=status.HTTP_404_NOT_FOUND)

        if notification.read:
            return Response({'message': 'Notification was already marked as read.'}, status=status.HTTP_200_OK)
            
        notification.read = True
        notification.save()
        
        return Response({'message': 'Notification marked as read.'}, status=status.HTTP_200_OK)


class SupportFeedbackView(APIView):
    """
    Records a support message from the authenticated user for follow-up.
    """

    def post(self, request):
        user, error_response = _authenticate_user(request)
        if error_response:
            return error_response

        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        context_url = request.data.get('context_url', '').strip() or None

        Notification(
            user=user,
            message=f"[Support] {message}",
            link_url=context_url
        ).save()

        return Response({'message': 'Support request submitted successfully.'}, status=status.HTTP_201_CREATED)