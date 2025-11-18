"""
GitHub Project Importer
Handles importing GitHub repositories into the platform with S3 file storage.
"""
import requests
import boto3
import os
import tempfile
import zipfile
from botocore.exceptions import ClientError
from django.conf import settings


class GitHubImporterError(Exception):
    pass


class GitHubImporter:
    
    
    def __init__(self, github_token=None):
        
        self.github_token = github_token
        self.s3_client = self._get_s3_client()
    
    def _get_s3_client(self):
        if not settings.AWS_ACCESS_KEY_ID:
            raise GitHubImporterError('AWS_ACCESS_KEY_ID is not configured')
        if not settings.AWS_SECRET_ACCESS_KEY:
            raise GitHubImporterError('AWS_SECRET_ACCESS_KEY is not configured')
        if not settings.AWS_STORAGE_BUCKET_NAME:
            raise GitHubImporterError('AWS_STORAGE_BUCKET_NAME is not configured')
        
        return boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME or 'us-east-1'
        )
    
    def validate_github_url(self, repo_url):
        
        if not repo_url:
            raise GitHubImporterError('Repository URL is required')
        
        # Clean the URL
        repo_url = repo_url.strip().rstrip('/')
        
        # Remove protocol if present
        if repo_url.startswith('https://'):
            repo_url = repo_url[8:]
        elif repo_url.startswith('http://'):
            repo_url = repo_url[7:]
        
        if repo_url.endswith('.git'):
            repo_url = repo_url[:-4]
        
        if repo_url.startswith('github.com/'):
            repo_url = repo_url[11:]
        
        parts = repo_url.split('/')
        if len(parts) < 2:
            raise GitHubImporterError('Invalid GitHub URL format. Expected: github.com/owner/repo')
        
        owner = parts[0]
        repo_name = parts[1]
        
        if not owner or not repo_name:
            raise GitHubImporterError('Invalid GitHub URL: owner and repository name are required')
        
        return owner, repo_name
    
    def get_repo_info(self, owner, repo_name):
        
        url = f'https://api.github.com/repos/{owner}/{repo_name}'
        headers = {
            'Accept': 'application/vnd.github.v3+json'
        }
        
        if self.github_token:
            headers['Authorization'] = f'token {self.github_token}'
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                if e.response.status_code == 404:
                    raise GitHubImporterError('Repository not found or is private')
                elif e.response.status_code == 401:
                    raise GitHubImporterError('Invalid GitHub token')
            raise GitHubImporterError(f'Failed to fetch repository info: {str(e)}')
    
    def download_repo_archive(self, owner, repo_name, branch='main'):
        
        for branch_name in [branch, 'master', 'main']:
            url = f'https://github.com/{owner}/{repo_name}/archive/refs/heads/{branch_name}.zip'
            headers = {}
            
            if self.github_token:
                headers['Authorization'] = f'token {self.github_token}'
            
            try:
                response = requests.get(url, headers=headers, timeout=30, stream=True)
                if response.status_code == 200:
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
                    for chunk in response.iter_content(chunk_size=8192):
                        temp_file.write(chunk)
                    temp_file.close()
                    return temp_file.name
            except requests.exceptions.RequestException:
                continue
        
        raise GitHubImporterError(f'Failed to download repository. Tried branches: {branch}, main, master')
    
    def upload_file_to_s3(self, file_path, s3_key, file_name):
        
        try:
            # Upload file
            self.s3_client.upload_file(
                file_path,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    'Metadata': {
                        'original_filename': file_name
                    }
                }
            )
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': s3_key
                },
                ExpiresIn=604800  # 7 days
            )
            
            return {
                's3_key': s3_key,
                'url': url,
                'file_name': file_name
            }
        except ClientError as e:
            raise GitHubImporterError(f'Failed to upload file to S3: {str(e)}')
    
    def extract_and_upload_files(self, zip_path, project_id, user_id, max_files=500, max_size_mb=100):
        
        uploaded_files = []
        max_size_bytes = max_size_mb * 1024 * 1024
        
        # Extract to temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
            except zipfile.BadZipFile:
                raise GitHubImporterError('Invalid zip file')
            
            file_count = 0
            for root, dirs, files in os.walk(temp_dir):
                # Skip common directories to ignore
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build']]
                
                for file_name in files:
                    if file_count >= max_files:
                        break
                    
                    if file_name.startswith('.') and file_name not in ['.env.example', '.gitignore']:
                        continue
                    
                    file_path = os.path.join(root, file_name)
                    
                    try:
                        file_size = os.path.getsize(file_path)
                        if file_size > max_size_bytes or file_size == 0:
                            continue
                    except OSError:
                        continue
                    
                    # Get relative path for better organization
                    rel_path = os.path.relpath(file_path, temp_dir)
                    
                    # Create S3 key
                    s3_key = f'projects/{project_id}/github_import/{rel_path}'
                    
                    try:
                        result = self.upload_file_to_s3(file_path, s3_key, file_name)
                        uploaded_files.append({
                            'file_name': file_name,
                            'relative_path': rel_path,
                            's3_key': result['s3_key'],
                            'url': result['url'],
                            'size': file_size
                        })
                        file_count += 1
                    except GitHubImporterError as e:
                        print(f"Failed to upload {file_name}: {e}")
                        continue
                
                if file_count >= max_files:
                    break
        
        return uploaded_files
    
    def import_repository(self, repo_url, project_id, user_id, branch='main'):
        
        owner, repo_name = self.validate_github_url(repo_url)
        
        repo_info = self.get_repo_info(owner, repo_name)
        
        zip_path = self.download_repo_archive(owner, repo_name, branch)
        
        try:
            # Extract and upload files
            uploaded_files = self.extract_and_upload_files(zip_path, project_id, user_id)
            
            return {
                'success': True,
                'repository': {
                    'name': repo_info['name'],
                    'full_name': repo_info['full_name'],
                    'description': repo_info.get('description', ''),
                    'url': repo_info['html_url'],
                    'language': repo_info.get('language', ''),
                    'stars': repo_info.get('stargazers_count', 0),
                    'forks': repo_info.get('forks_count', 0),
                },
                'files': uploaded_files,
                'total_files': len(uploaded_files),
                'message': f'Successfully imported {len(uploaded_files)} files from {repo_info["full_name"]}'
            }
        finally:
            try:
                os.unlink(zip_path)
            except OSError:
                pass
