import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface FirebaseAppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function readFirebaseConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as FirebaseAppletConfig;
  } catch {
    return {};
  }
}

const fileConfig = readFirebaseConfig();
const projectId = process.env.FIREBASE_PROJECT_ID || fileConfig.projectId;
const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId;

const adminApp = getApps().length
  ? getApp()
  : initializeApp(projectId ? { projectId } : undefined);

export const adminAuth = getAuth(adminApp);
export const adminDb =
  firestoreDatabaseId && firestoreDatabaseId !== '(default)'
    ? getFirestore(adminApp, firestoreDatabaseId)
    : getFirestore(adminApp);
export const adminFieldValue = FieldValue;
export const FIREBASE_DATABASE_ID = firestoreDatabaseId || '(default)';
