import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseStorageService {
  private bucket: any; // Using any to avoid TypeScript issues with Firebase Admin SDK

  constructor(private configService: ConfigService) {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      try {
        // Try to use GOOGLE_APPLICATION_CREDENTIALS first
        const credentialsPath = this.configService.get(
          'GOOGLE_APPLICATION_CREDENTIALS',
        );

        if (credentialsPath && fs.existsSync(credentialsPath)) {
          // Use service account file
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
          });
        } else {
          // Use environment variables
          const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');

          if (!privateKey) {
            throw new Error(
              'FIREBASE_PRIVATE_KEY environment variable is required',
            );
          }

          // Clean up the private key - remove any extra quotes or formatting
          const cleanedPrivateKey = privateKey
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/\\n/g, '\n') // Replace literal \n with actual newlines
            .replace(/\\/g, ''); // Remove any remaining backslashes

          const serviceAccount = {
            type: 'service_account',
            project_id: this.configService.get('FIREBASE_PROJECT_ID'),
            private_key_id: this.configService.get('FIREBASE_PRIVATE_KEY_ID'),
            private_key: cleanedPrivateKey,
            client_email: this.configService.get('FIREBASE_CLIENT_EMAIL'),
            client_id: this.configService.get('FIREBASE_CLIENT_ID'),
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url:
              'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: this.configService.get(
              'FIREBASE_CLIENT_X509_CERT_URL',
            ),
          };

          // Validate required fields
          if (
            !serviceAccount.project_id ||
            !serviceAccount.private_key ||
            !serviceAccount.client_email
          ) {
            throw new Error(
              'Missing required Firebase configuration. Please check FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.',
            );
          }

          admin.initializeApp({
            credential: admin.credential.cert(
              serviceAccount as admin.ServiceAccount,
            ),
            storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
          });
        }

        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (error) {
        console.error(
          '❌ Failed to initialize Firebase Admin SDK:',
          error.message,
        );
        throw new Error(`Firebase initialization failed: ${error.message}`);
      }
    }

    this.bucket = admin.storage().bucket();
  }

  async uploadFile(
    filePath: string,
    destination: string,
    contentType?: string,
  ): Promise<string> {
    try {
      const [file] = await this.bucket.upload(filePath, {
        destination,
        metadata: {
          contentType: contentType || this.getContentType(filePath),
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${destination}`;

      console.log(`✅ File uploaded to Firebase Storage: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error uploading file to Firebase Storage:', error);
      throw new Error(
        `Failed to upload file to Firebase Storage: ${error.message}`,
      );
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    destination: string,
    contentType?: string,
  ): Promise<string> {
    try {
      const file = this.bucket.file(destination);

      await file.save(buffer, {
        metadata: {
          contentType: contentType || this.getContentType(destination),
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${destination}`;

      console.log(`✅ Buffer uploaded to Firebase Storage: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error uploading buffer to Firebase Storage:', error);
      throw new Error(
        `Failed to upload buffer to Firebase Storage: ${error.message}`,
      );
    }
  }

  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    try {
      const file = this.bucket.file(remotePath);
      await file.download({ destination: localPath });
      console.log(`✅ File downloaded from Firebase Storage: ${localPath}`);
    } catch (error) {
      console.error('❌ Error downloading file from Firebase Storage:', error);
      throw new Error(
        `Failed to download file from Firebase Storage: ${error.message}`,
      );
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    try {
      const file = this.bucket.file(remotePath);
      await file.delete();
      console.log(`✅ File deleted from Firebase Storage: ${remotePath}`);
    } catch (error) {
      console.error('❌ Error deleting file from Firebase Storage:', error);
      throw new Error(
        `Failed to delete file from Firebase Storage: ${error.message}`,
      );
    }
  }

  async getSignedUrl(
    remotePath: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const file = this.bucket.file(remotePath);
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });
      return signedUrl;
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  generateStoragePath(developerId: string, fileName: string): string {
    const timestamp = Date.now();
    return `resumes/${developerId}/${timestamp}-${fileName}`;
  }
}
