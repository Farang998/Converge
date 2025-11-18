# GitHub Project Import Feature

## Overview
This feature allows users to import their GitHub repositories directly into the Converge platform. All files from the repository are automatically uploaded to AWS S3 and made available in the project's file sharing section.

## Features

### 1. **Easy GitHub Integration**
   - Import public GitHub repositories without authentication
   - Support for private repositories using Personal Access Token
   - Automatic branch detection (tries 'main', 'master', or custom branch)

### 2. **S3 File Storage**
   - All imported files are stored securely in AWS S3
   - Organized folder structure: `projects/{project_id}/github_import/`
   - Pre-signed URLs for secure file access (7-day validity)

### 3. **Smart File Filtering**
   - Automatically excludes common directories: `.git`, `node_modules`, `__pycache__`, `.venv`, `dist`, `build`
   - Skips hidden files (except `.env.example`, `.gitignore`)
   - File size limit: 100MB per file
   - Maximum 500 files per import

### 4. **Project Tracking**
   - Stores GitHub repository metadata in project
   - Tracks import date and user who performed import
   - Creates file records for all imported files
   - Sends notifications to all project members

## Backend Implementation

### 1. **New Model Fields** (`models.py`)
```python
github_imported = BooleanField(default=False)
github_repo_url = StringField()
github_repo_name = StringField()
github_import_date = DateTimeField()
github_import_metadata = DictField()  # Store repo info, file count, etc.
```

### 2. **GitHub Importer Service** (`github_importer.py`)
- `GitHubImporter` class handles all import logic
- Methods:
  - `validate_github_url()` - Validates and parses GitHub URLs
  - `get_repo_info()` - Fetches repository metadata from GitHub API
  - `download_repo_archive()` - Downloads repository as ZIP
  - `extract_and_upload_files()` - Extracts and uploads files to S3
  - `import_repository()` - Main workflow orchestration

### 3. **API Endpoint** (`views.py`)
**Endpoint:** `POST /api/projects/<project_id>/import-github/`

**Request Body:**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "branch": "main",
  "github_token": "ghp_xxx..." // Optional, for private repos
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 150 files from owner/repo",
  "repository": {
    "name": "repo",
    "full_name": "owner/repo",
    "description": "Repository description",
    "url": "https://github.com/owner/repo",
    "language": "Python",
    "stars": 100,
    "forks": 25
  },
  "total_files": 150,
  "files_sample": [...]
}
```

## Frontend Implementation

### 1. **GitHubImport Component** (`GitHubImport.jsx`)
- Modal dialog for GitHub import
- Form fields:
  - Repository URL (required)
  - Branch name (default: 'main')
  - GitHub Personal Access Token (optional, for private repos)
- Real-time validation and error handling
- Loading states with spinner animation

### 2. **Integration with ProjectWorkspace**
- Import button added to FilesView
- Opens modal when clicked
- Automatically switches to Files view after successful import
- Updates activity feed with import details

### 3. **User Interface**
- Clean, modern modal design
- Responsive layout (mobile-friendly)
- Clear instructions and hints
- Visual feedback during import process

## Usage Guide

### For Public Repositories:

1. Navigate to a project workspace
2. Go to the Files section
3. Click "📦 Import from GitHub" button
4. Enter the GitHub repository URL:
   ```
   https://github.com/username/repository
   ```
5. (Optional) Specify a branch (default: 'main')
6. Click "Import Repository"

### For Private Repositories:

1. Follow steps 1-4 above
2. Check "Private repository (requires token)"
3. Generate a GitHub Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (Full control of private repositories)
   - Copy the generated token
4. Paste token in the form
5. Click "Import Repository"

## Configuration Requirements

### Backend Environment Variables (.env):
```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=us-east-1  # Optional, default: us-east-1
```

### Dependencies:
```bash
# Install required packages
pip install boto3>=1.28.0 requests>=2.31.0
```

## Error Handling

The feature handles various error scenarios:

1. **Invalid GitHub URL**: Validates URL format before processing
2. **Repository Not Found**: Returns clear error if repo doesn't exist
3. **Authentication Failures**: Detects invalid tokens or permission issues
4. **Network Errors**: Handles download failures gracefully
5. **S3 Upload Failures**: Reports which files failed to upload
6. **File Size Limits**: Skips files exceeding size limits

## Security Considerations

1. **Token Handling**: GitHub tokens are only used during import and not stored
2. **Access Control**: Only project members can import repositories
3. **S3 Security**: Files stored with proper access controls
4. **Pre-signed URLs**: Time-limited URLs (7 days) for file access
5. **Input Validation**: All inputs validated before processing

## Limitations

1. Maximum 500 files per import
2. Maximum 100MB per file
3. Pre-signed URLs expire after 7 days
4. Rate limits apply for GitHub API (60 requests/hour without token)
5. Excludes certain directories automatically (node_modules, .git, etc.)

## Future Enhancements

1. **Incremental Updates**: Sync changes from GitHub periodically
2. **Branch Selection UI**: Dropdown to select available branches
3. **File Preview**: Preview files before importing
4. **Selective Import**: Choose specific files/folders to import
5. **Import History**: Track multiple imports from different repos
6. **GitHub OAuth**: Native GitHub OAuth integration
7. **Webhook Support**: Auto-import on GitHub push events

## Troubleshooting

### Issue: "Failed to download repository"
**Solution**: Check if repository exists and is public. For private repos, ensure valid token is provided.

### Issue: "AWS_ACCESS_KEY_ID is not configured"
**Solution**: Ensure AWS credentials are set in `.env` file.

### Issue: "Repository not found or is private"
**Solution**: Verify URL is correct and repository is public, or provide a valid GitHub token.

### Issue: "Failed to upload file to S3"
**Solution**: Check AWS credentials and S3 bucket permissions.

## API Examples

### Using cURL:
```bash
curl -X POST http://localhost:8000/api/projects/{project_id}/import-github/ \
  -H "Authorization: Token your_auth_token" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/username/repo",
    "branch": "main"
  }'
```

### Using JavaScript (Fetch):
```javascript
const response = await fetch(`/api/projects/${projectId}/import-github/`, {
  method: 'POST',
  headers: {
    'Authorization': `Token ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repo_url: 'https://github.com/username/repo',
    branch: 'main'
  })
});

const result = await response.json();
console.log(`Imported ${result.total_files} files`);
```

## Support

For issues or questions:
1. Check the error message in the UI
2. Review backend logs for detailed error information
3. Verify AWS and GitHub configurations
4. Ensure all dependencies are installed

## License

This feature is part of the Converge platform and follows the same license terms.
