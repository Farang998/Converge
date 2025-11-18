# GitHub Import Feature - Quick Setup Guide

## Prerequisites

1. **AWS S3 Configuration**
   - AWS account with S3 bucket created
   - IAM user with S3 access permissions
   - Access Key ID and Secret Access Key

2. **Python Dependencies**
   ```bash
   pip install boto3>=1.28.0 requests>=2.31.0
   ```

## Backend Setup

### Step 1: Configure Environment Variables

Create or update `.env` file in `backend/remote-work/`:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=us-east-1
```

### Step 2: Install Dependencies

```bash
cd backend/remote-work
pip install -r ../../requirements.txt
```

### Step 3: Run Migrations (if needed)

Since we're using MongoDB with MongoEngine, the schema changes are automatic. Just ensure MongoDB is running:

```bash
python manage.py runserver
```

### Step 4: Test the Backend

```bash
# Test GitHub import endpoint
curl -X POST http://localhost:8000/api/projects/<project_id>/import-github/ \
  -H "Authorization: Token your_auth_token" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/octocat/Hello-World",
    "branch": "master"
  }'
```

## Frontend Setup

### Step 1: No Additional Dependencies Required

The frontend implementation uses existing dependencies.

### Step 2: Start Frontend Development Server

```bash
cd frontend
npm run dev
```

### Step 3: Test the Feature

1. Navigate to http://localhost:5173
2. Login to your account
3. Open any project
4. Go to Files section
5. Click "📦 Import from GitHub" button
6. Enter repository URL: `https://github.com/octocat/Hello-World`
7. Click "Import Repository"

## AWS S3 Bucket Configuration

### Required Permissions

Your IAM user needs the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your_bucket_name/*",
        "arn:aws:s3:::your_bucket_name"
      ]
    }
  ]
}
```

### CORS Configuration (if accessing from browser)

If you need to access files directly from the browser, configure CORS on your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:8000"],
    "ExposeHeaders": []
  }
]
```

## Testing the Feature

### Test with Public Repository

1. Use a public test repository:
   - https://github.com/octocat/Hello-World
   - https://github.com/github/gitignore

2. Expected behavior:
   - Files are downloaded from GitHub
   - Files are uploaded to S3
   - File records are created in database
   - Notifications are sent to project members
   - Activity log is updated

### Test with Private Repository

1. Generate GitHub Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (Full control of private repositories)
   - Copy the token

2. Use the token in import form:
   - Check "Private repository" option
   - Paste your token
   - Import your private repository

## Troubleshooting

### Issue: "AWS_ACCESS_KEY_ID is not configured"

**Solution:**
```bash
# Check if .env file exists
cd backend/remote-work
cat .env

# If not, create it
cat > .env << EOF
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_STORAGE_BUCKET_NAME=your_bucket
AWS_S3_REGION_NAME=us-east-1
EOF
```

### Issue: "Repository not found or is private"

**Solution:**
- Verify the repository URL is correct
- For private repos, ensure you provide a valid GitHub token
- Check that the token has `repo` scope

### Issue: "Failed to upload file to S3"

**Solution:**
1. Verify AWS credentials are correct
2. Check S3 bucket exists and is accessible
3. Verify IAM permissions include `s3:PutObject`
4. Check network connectivity to AWS

### Issue: Backend not starting

**Solution:**
```bash
# Install missing dependencies
pip install boto3 requests

# Check for syntax errors
python manage.py check

# Run with verbose logging
python manage.py runserver --verbosity 3
```

## Verification Checklist

- [ ] Backend server running without errors
- [ ] Frontend development server running
- [ ] AWS credentials configured in `.env`
- [ ] S3 bucket created and accessible
- [ ] Can access project workspace
- [ ] "Import from GitHub" button visible in Files section
- [ ] Can import public repository successfully
- [ ] Files appear in Files section after import
- [ ] Activity log shows import event
- [ ] Other project members receive notification

## Next Steps

After successful setup:

1. **Test with Real Projects**: Import actual GitHub repositories
2. **Monitor S3 Costs**: Keep track of storage usage
3. **Set Up Backup**: Configure S3 bucket versioning
4. **Performance Tuning**: Adjust file limits if needed
5. **Security Review**: Review access controls and permissions

## Support Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [Django REST Framework](https://www.django-rest-framework.org/)

## Quick Commands Reference

```bash
# Start backend
cd backend/remote-work && python manage.py runserver

# Start frontend
cd frontend && npm run dev

# Install dependencies
pip install boto3 requests

# Test API endpoint
curl -X POST http://localhost:8000/api/projects/{id}/import-github/ \
  -H "Authorization: Token {token}" \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/owner/repo"}'

# Check logs
tail -f backend/remote-work/logs/debug.log
```

## Configuration Examples

### Development Environment
```bash
# .env for development
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_STORAGE_BUCKET_NAME=converge-dev-files
AWS_S3_REGION_NAME=us-east-1
```

### Production Environment
```bash
# .env for production (use secrets manager)
AWS_ACCESS_KEY_ID=${AWS_KEY_FROM_SECRETS}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_FROM_SECRETS}
AWS_STORAGE_BUCKET_NAME=converge-prod-files
AWS_S3_REGION_NAME=us-east-1
```

## Success! 🎉

You should now have the GitHub Import feature fully functional. Users can import their GitHub projects directly into the platform with all files stored securely in S3.
