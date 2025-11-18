from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from mongoengine.errors import DoesNotExist, ValidationError as MongoValidationError
import boto3
from botocore.exceptions import ClientError
from django.conf import settings
import os
import uuid
from datetime import timedelta

from ..auth.models import User
from ..projects.models import Project
from .models import File

# Error constants
ERROR_AUTH_HEADER_MISSING = 'Authorization header missing'
ERROR_INVALID_AUTH_HEADER = 'Invalid authorization header format'
ERROR_INVALID_TOKEN = 'Invalid or expired token'
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB in bytes


def _authenticate_user(request):
    """Helper to authenticate user from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise AuthenticationFailed(ERROR_AUTH_HEADER_MISSING)
    
    try:
        # Support both "Token <token>" and "Bearer <token>" formats
        parts = auth_header.split(' ')
        if len(parts) != 2:
            raise AuthenticationFailed(ERROR_INVALID_AUTH_HEADER)
        token = parts[1]
    except IndexError:
        raise AuthenticationFailed(ERROR_INVALID_AUTH_HEADER)
    
    user = User.validate_token(token)
    if not user:
        raise AuthenticationFailed(ERROR_INVALID_TOKEN)
    return user


def _check_project_access(user, project):
    """Check if user has access to the project (leader or accepted member)."""
    # Check if user is the team leader
    if project.team_leader == user:
        return True
    
    # Check if user is an accepted team member
    user_id_str = str(user.id)
    for member in project.team_members:
        if member.get('user') == user_id_str and member.get('accepted', False):
            return True
    
    return False

def _get_s3_client():
    """Initialize and return S3 client."""
    # Validate AWS settings
    if not settings.AWS_ACCESS_KEY_ID:
        raise ValueError('AWS_ACCESS_KEY_ID is not configured')
    if not settings.AWS_SECRET_ACCESS_KEY:
        raise ValueError('AWS_SECRET_ACCESS_KEY is not configured')
    if not settings.AWS_STORAGE_BUCKET_NAME:
        raise ValueError('AWS_STORAGE_BUCKET_NAME is not configured')
    
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME or 'us-east-1'
    )


class FileUploadView(APIView):
    """
    Handle file uploads.
    POST /api/file_sharing/upload/
    """
    
    def post(self, request):
        try:
            user = _authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get project_id from request
        project_id = request.data.get('project_id')
        if not project_id:
            return Response({'error': 'project_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get file from request
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        
        # Validate file size (5 MB limit)
        if uploaded_file.size > MAX_FILE_SIZE:
            return Response({
                'error': f'File size exceeds 5 MB limit. File size: {uploaded_file.size / (1024*1024):.2f} MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get project and verify access
        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user has access to project (can upload)
        if not _check_project_access(user, project):
            return Response({
                'error': 'You do not have access to this project'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if file with same name already exists in this project
        existing_file = File.objects(project=project, name=uploaded_file.name).first()
        if existing_file:
            return Response({
                'error': f'A file with the name "{uploaded_file.name}" already exists in this project. Please rename the file or delete the existing one.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate unique S3 key
        file_extension = os.path.splitext(uploaded_file.name)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        s3_key = f"files/{project_id}/{unique_filename}"
        
        # Upload to S3
        try:
            s3_client = _get_s3_client()
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            if not bucket_name:
                return Response({
                    'error': 'AWS S3 bucket is not configured. Please set AWS_STORAGE_BUCKET_NAME in environment variables.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            s3_client.upload_fileobj(
                uploaded_file,
                bucket_name,
                s3_key,
                ExtraArgs={'ContentType': uploaded_file.content_type or 'application/octet-stream'}
            )
        except ValueError as e:
            # AWS configuration error
            return Response({
                'error': f'AWS configuration error: {str(e)}. Please configure AWS credentials in environment variables.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ClientError as e:
            return Response({
                'error': f'Failed to upload file to S3: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'error': f'Unexpected error during file upload: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Save file metadata to database
        try:
            file_obj = File(
                name=uploaded_file.name,
                s3_key=s3_key,
                file_size=uploaded_file.size,
                content_type=uploaded_file.content_type,
                uploaded_by=user,
                project=project
            )
            file_obj.save()
        except Exception as e:
            # If database save fails, try to delete from S3
            try:
                s3_client.delete_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=s3_key
                )
            except:
                pass
            return Response({
                'error': f'Failed to save file metadata: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Get project participants (leader + accepted members)
        participants = []
        participants.append({
            'user_id': str(project.team_leader.id),
            'username': project.team_leader.username
        })
        for member in project.team_members:
            if member.get('accepted', False):
                try:
                    member_user = User.objects.get(id=member['user'])
                    participants.append({
                        'user_id': str(member_user.id),
                        'username': member_user.username
                    })
                except User.DoesNotExist:
                    pass
        
        return Response({
            'message': 'File uploaded successfully',
            'file_id': str(file_obj.id),
            'file_name': file_obj.name,
            'file_size': file_obj.file_size,
            'uploaded_by': {
                'user_id': str(user.id),
                'username': user.username
            },
            'project_id': str(project.id),
            'project_name': project.name,
            's3_path': s3_key,
            'participants_with_access': participants,
            'uploaded_at': file_obj.uploaded_at.isoformat()
        }, status=status.HTTP_201_CREATED)

class FileListView(APIView):
    """
    List files for a project.
    GET /api/file_sharing/project/<project_id>/
    """
    
    def get(self, request, project_id):
        try:
            user = _authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get project and verify access
        try:
            project = Project.objects.get(id=project_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user has access to project
        if not _check_project_access(user, project):
            return Response({
                'error': 'You do not have access to this project'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get all files for this project
        files = File.objects(project=project).order_by('-uploaded_at')
        
        files_list = []
        for file_obj in files:
            # Get uploader info
            uploader = file_obj.uploaded_by
            files_list.append({
                'file_id': str(file_obj.id),
                'file_name': file_obj.name,
                'file_size': file_obj.file_size,
                'content_type': file_obj.content_type,
                'uploaded_by': {
                    'user_id': str(uploader.id),
                    'username': uploader.username
                },
                'uploaded_at': file_obj.uploaded_at.isoformat() if file_obj.uploaded_at else None,
                's3_path': file_obj.s3_key
            })
        
        return Response({
            'project_id': str(project.id),
            'project_name': project.name,
            'files': files_list,
            'total_files': len(files_list)
        }, status=status.HTTP_200_OK)


class FileDownloadView(APIView):
    """
    Get pre-signed URL for file download.
    GET /api/file_sharing/download/<file_id>/
    """
    
    def get(self, request, file_id):
        try:
            user = _authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get file
        try:
            file_obj = File.objects.get(id=file_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user has access to the project
        project = file_obj.project
        if not _check_project_access(user, project):
            return Response({
                'error': 'You do not have access to this file'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Generate pre-signed URL (valid for 1 hour)
        try:
            s3_client = _get_s3_client()
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            if not bucket_name:
                return Response({
                    'error': 'AWS S3 bucket is not configured. Please set AWS_STORAGE_BUCKET_NAME in environment variables.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': file_obj.s3_key,
                    'ResponseContentDisposition': f'attachment; filename="{file_obj.name}"'
                },
                ExpiresIn=3600  # 1 hour
            )
        except ValueError as e:
            return Response({
                'error': f'AWS configuration error: {str(e)}. Please configure AWS credentials in environment variables.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ClientError as e:
            return Response({
                'error': f'Failed to generate download URL: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'error': f'Unexpected error generating download URL: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'file_id': str(file_obj.id),
            'file_name': file_obj.name,
            'file_size': file_obj.file_size,
            'content_type': file_obj.content_type,
            'download_url': presigned_url,
            'expires_in_seconds': 3600
        }, status=status.HTTP_200_OK)


class FileDownloadProxyView(APIView):
    """
    Proxy download through backend to avoid CORS issues.
    GET /api/file_sharing/download-proxy/<file_id>/
    """
    
    def get(self, request, file_id):
        try:
            user = _authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get file
        try:
            file_obj = File.objects.get(id=file_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user has access to the project
        project = file_obj.project
        if not _check_project_access(user, project):
            return Response({
                'error': 'You do not have access to this file'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Generate pre-signed URL and fetch file
        try:
            s3_client = _get_s3_client()
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            if not bucket_name:
                return Response({
                    'error': 'AWS S3 bucket is not configured. Please set AWS_STORAGE_BUCKET_NAME in environment variables.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Get file from S3
            s3_response = s3_client.get_object(
                Bucket=bucket_name,
                Key=file_obj.s3_key
            )
            
            # Stream file content
            from django.http import StreamingHttpResponse
            import mimetypes
            
            content_type = file_obj.content_type or mimetypes.guess_type(file_obj.name)[0] or 'application/octet-stream'
            
            response = StreamingHttpResponse(
                s3_response['Body'].iter_chunks(chunk_size=8192),
                content_type=content_type
            )
            response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
            response['Content-Length'] = file_obj.file_size
            
            return response
        except ValueError as e:
            return Response({
                'error': f'AWS configuration error: {str(e)}. Please configure AWS credentials in environment variables.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ClientError as e:
            return Response({
                'error': f'Failed to download file from S3: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'error': f'Unexpected error downloading file: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FileDeleteView(APIView):
    """
    Delete a file.
    DELETE /api/file_sharing/delete/<file_id>/
    """
    
    def delete(self, request, file_id):
        try:
            user = _authenticate_user(request)
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get file
        try:
            file_obj = File.objects.get(id=file_id)
        except (DoesNotExist, MongoValidationError):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user is the one who uploaded the file
        if file_obj.uploaded_by != user:
            return Response({
                'error': 'You can only delete files that you uploaded'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Delete from S3
        try:
            s3_client = _get_s3_client()
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            if bucket_name:
                try:
                    s3_client.delete_object(
                        Bucket=bucket_name,
                        Key=file_obj.s3_key
                    )
                except ClientError as e:
                    # Log error but continue with database deletion
                    print(f'Warning: Failed to delete file from S3: {str(e)}')
        except ValueError:
            # AWS not configured, but still delete from database
            pass
        except Exception as e:
            # Log error but continue with database deletion
            print(f'Warning: Error deleting from S3: {str(e)}')
        
        # Delete from database
        file_name = file_obj.name
        file_obj.delete()
        
        return Response({
            'message': f'File "{file_name}" deleted successfully'
        }, status=status.HTTP_200_OK)

