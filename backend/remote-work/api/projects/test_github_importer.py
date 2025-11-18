"""
Unit tests for GitHub Importer functionality.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os
from api.projects.github_importer import GitHubImporter, GitHubImporterError


class TestGitHubImporter(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures."""
        self.importer = GitHubImporter()
    
    def test_validate_github_url_success(self):
        """Test valid GitHub URL validation."""
        test_urls = [
            ('https://github.com/owner/repo', ('owner', 'repo')),
            ('http://github.com/owner/repo', ('owner', 'repo')),
            ('github.com/owner/repo', ('owner', 'repo')),
            ('https://github.com/owner/repo.git', ('owner', 'repo')),
            ('owner/repo', ('owner', 'repo')),
        ]
        
        for url, expected in test_urls:
            with self.subTest(url=url):
                result = self.importer.validate_github_url(url)
                self.assertEqual(result, expected)
    
    def test_validate_github_url_failure(self):
        """Test invalid GitHub URL validation."""
        test_urls = [
            '',
            'https://gitlab.com/owner/repo',
            'owner',
            '/repo',
            'https://github.com/',
        ]
        
        for url in test_urls:
            with self.subTest(url=url):
                with self.assertRaises(GitHubImporterError):
                    self.importer.validate_github_url(url)
    
    @patch('api.projects.github_importer.requests.get')
    def test_get_repo_info_success(self, mock_get):
        """Test fetching repository information."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'name': 'test-repo',
            'full_name': 'owner/test-repo',
            'description': 'Test repository',
            'html_url': 'https://github.com/owner/test-repo',
            'language': 'Python',
            'stargazers_count': 100,
            'forks_count': 25
        }
        mock_get.return_value = mock_response
        
        result = self.importer.get_repo_info('owner', 'test-repo')
        
        self.assertEqual(result['name'], 'test-repo')
        self.assertEqual(result['full_name'], 'owner/test-repo')
        self.assertEqual(result['language'], 'Python')
    
    @patch('api.projects.github_importer.requests.get')
    def test_get_repo_info_not_found(self, mock_get):
        """Test repository not found error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = Exception()
        mock_get.return_value = mock_response
        
        with self.assertRaises(GitHubImporterError) as context:
            self.importer.get_repo_info('owner', 'nonexistent-repo')
        
        self.assertIn('not found', str(context.exception).lower())
    
    def test_s3_client_initialization(self):
        """Test S3 client initialization."""
        # This will fail if AWS credentials are not configured
        # In a real test environment, you'd mock the boto3 client
        with patch('api.projects.github_importer.boto3.client') as mock_client:
            with patch('api.projects.github_importer.settings') as mock_settings:
                mock_settings.AWS_ACCESS_KEY_ID = 'test_key'
                mock_settings.AWS_SECRET_ACCESS_KEY = 'test_secret'
                mock_settings.AWS_STORAGE_BUCKET_NAME = 'test_bucket'
                mock_settings.AWS_S3_REGION_NAME = 'us-east-1'
                
                importer = GitHubImporter()
                client = importer._get_s3_client()
                
                mock_client.assert_called_once()
    
    def test_extract_and_upload_files_excludes_directories(self):
        """Test that certain directories are excluded during extraction."""
        # Create a temporary zip file with excluded directories
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test structure
            os.makedirs(os.path.join(temp_dir, 'node_modules'))
            os.makedirs(os.path.join(temp_dir, '.git'))
            os.makedirs(os.path.join(temp_dir, 'src'))
            
            # Create some files
            with open(os.path.join(temp_dir, 'README.md'), 'w') as f:
                f.write('# Test')
            with open(os.path.join(temp_dir, 'src', 'main.py'), 'w') as f:
                f.write('print("hello")')
            with open(os.path.join(temp_dir, 'node_modules', 'package.json'), 'w') as f:
                f.write('{}')
            
            # This test would require mocking the S3 upload and zip extraction
            # For now, it serves as a placeholder for the intended test


class TestGitHubImportEndpoint(unittest.TestCase):
    """Tests for the GitHub import API endpoint."""
    
    def setUp(self):
        """Set up test fixtures."""
        # In a real test, you'd set up a test client and database
        pass
    
    def test_import_requires_authentication(self):
        """Test that import endpoint requires authentication."""
        # Placeholder for authentication test
        pass
    
    def test_import_requires_project_access(self):
        """Test that only project members can import."""
        # Placeholder for authorization test
        pass
    
    def test_import_creates_file_records(self):
        """Test that file records are created after import."""
        # Placeholder for file record creation test
        pass
    
    def test_import_updates_project_metadata(self):
        """Test that project metadata is updated after import."""
        # Placeholder for metadata update test
        pass
    
    def test_import_sends_notifications(self):
        """Test that notifications are sent to project members."""
        # Placeholder for notification test
        pass


if __name__ == '__main__':
    unittest.main()
