import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  providerData: Array<{
    providerId: string;
    uid: string;
  }>;
}

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      return;
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.logger.log(
        'Firebase Admin initialized with service account credentials',
      );
    } else {
      admin.initializeApp({
        projectId: projectId || 'pokerank-app',
      });
      this.logger.warn(
        'Firebase Admin initialized without service account — only emulator tokens will work',
      );
    }
  }

  async verifyIdToken(idToken: string): Promise<FirebaseUser> {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const userRecord = await admin.auth().getUser(decoded.uid);

    return {
      uid: decoded.uid,
      email: decoded.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      providerData: userRecord.providerData.map((p) => ({
        providerId: p.providerId,
        uid: p.uid,
      })),
    };
  }
}
