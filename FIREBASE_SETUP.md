# Firebase Storage Setup

This project now uses Firebase Storage for storing resume files instead of local storage.

## Prerequisites

1. **Firebase Project**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Firebase Storage**: Enable Firebase Storage in your project
3. **Service Account**: Generate a service account key

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard
4. Enable Firebase Storage

### 2. Generate Service Account Key

1. In Firebase Console, go to Project Settings
2. Click "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file

### 3. Configure Environment Variables

Add these environment variables to your `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
[Your actual private key content here]
...
-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email%40your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

**Important**: The `FIREBASE_PRIVATE_KEY` should be the exact private key from your service account JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers.

**Alternative**: You can also use a service account JSON file:

```env
GOOGLE_APPLICATION_CREDENTIALS=path/to/your-service-account-key.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 4. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 5. Configure Firebase Storage Rules

In Firebase Console, go to Storage > Rules and set:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /resumes/{userId}/{allPaths=**} {
      allow read: if true;  // Public read access for resumes
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```

## Features

### ✅ **File Storage**

- Resumes stored in Firebase Storage
- Organized by developer ID and timestamp
- Public URLs for easy access

### ✅ **File Operations**

- Upload files from local processing
- Download files for processing
- Delete files when needed
- Generate signed URLs

### ✅ **Benefits**

- Scalable cloud storage
- No local disk space usage
- Global CDN access
- Automatic backup and redundancy

## File Structure

Files are stored in Firebase Storage with this structure:

```
resumes/
├── {developerId}/
│   ├── {timestamp}-auto-resume-{developerId}-{timestamp}.docx
│   └── {timestamp}-auto-resume-{developerId}-{timestamp}.pdf
```

## Migration from Local Storage

If you have existing resumes stored locally:

1. **Backup your data** before migration
2. **Run the migration**: `npm run db:migrate`
3. **Upload existing files** to Firebase Storage (manual process)
4. **Update database URLs** to point to Firebase Storage

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Check your service account credentials
2. **Permission Denied**: Verify Firebase Storage rules
3. **Bucket Not Found**: Check FIREBASE_STORAGE_BUCKET value
4. **Private Key Format**: Ensure private key includes newlines

### Debug Commands:

```bash
# Check Firebase connection
npm run start:dev

# View logs for upload/download operations
# Check console output for Firebase Storage URLs
```

## Security Considerations

- ✅ Service account credentials are environment variables
- ✅ Files are publicly readable (resumes are meant to be shared)
- ✅ Write access is controlled by your application
- ✅ Temporary files are cleaned up after processing

## Cost Optimization

- Files are automatically cleaned up after processing
- Use appropriate file sizes for resumes
- Monitor Firebase Storage usage in Firebase Console
