import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  initializeAuth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithCredential,
  signOut,
  Auth 
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe lookup for React Native persistence provider
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCWaMp_OaYPhRJkYgKMhiMYEM4SoOYIW3s",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "cogni-28f6e.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "cogni-28f6e",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "cogni-28f6e.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1088208498167",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1088208498167:web:4524f40cf9ac2b673992f2"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (Web uses IndexedDB cache, Native uses default persistence)
let db: Firestore;
if (Platform.OS === 'web') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

// Initialize Auth with AsyncStorage Persistence for Native React Native
let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    auth = getAuth(app);
  }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, db, auth, googleProvider, signInWithPopup, signInWithCredential, signOut };
