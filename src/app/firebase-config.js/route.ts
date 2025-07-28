
import { NextResponse } from 'next/server';

export function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const scriptContent = `self.firebaseConfig = ${JSON.stringify(firebaseConfig)};`;

  return new NextResponse(scriptContent, {
    headers: { 'Content-Type': 'application/javascript' },
  });
}
