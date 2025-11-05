# api/notifications/views.py

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

class NotificationListView(APIView):
    """
    Handles fetching and managing user notifications.
    """
    
    def get(self, request):
        """
        Gets all unread notifications for the authenticated user.
        """
        # 1. Authenticate the user
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': ERROR_AUTH_HEADER_MISSING}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return Response({'error': ERROR_INVALID_AUTH_HEADER}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = User.validate_token(token)
        if not user:
            return Response({'error': ERROR_INVALID_TOKEN}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Fetch unread notifications for this user
        notifications = Notification.objects(user=user, read=False)
        
        # 3. Serialize the data
        # We call the .to_json() method we defined in the model
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
        # 1. Authenticate the user
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({'error': ERROR_AUTH_HEADER_MISSING}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return Response({'error': ERROR_INVALID_AUTH_HEADER}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = User.validate_token(token)
        if not user:
            return Response({'error': ERROR_INVALID_TOKEN}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Find the notification
        try:
            # CRITICAL: We check for both ID AND that the user owns it.
            # This prevents User A from marking User B's notifications as read.
            notification = Notification.objects.get(id=notification_id, user=user)
            
        except (DoesNotExist, ValidationError):
            return Response({'error': 'Notification not found or you do not have permission.'}, status=status.HTTP_404_NOT_FOUND)

        # 3. Update the notification
        if notification.read:
            return Response({'message': 'Notification was already marked as read.'}, status=status.HTTP_200_OK)
            
        notification.read = True
        notification.save()
        
        return Response({'message': 'Notification marked as read.'}, status=status.HTTP_200_OK)