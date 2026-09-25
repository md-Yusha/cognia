export const initializeApp = jest.fn();
export const getApps = jest.fn(() => []);
export const getApp = jest.fn();
export const getFirestore = jest.fn();
export const initializeFirestore = jest.fn();
export const persistentLocalCache = jest.fn();
export const persistentMultipleTabManager = jest.fn();
export const getAuth = jest.fn();
export class GoogleAuthProvider {
  setCustomParameters = jest.fn();
}
export const signInWithPopup = jest.fn();
export const signInWithCredential = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const createUserWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const doc = jest.fn();
export const getDoc = jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) }));
export const setDoc = jest.fn(() => Promise.resolve());
export const collection = jest.fn();
export const addDoc = jest.fn();
