import { initializeApp } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

export const verifyMemberBeforeOtp = httpsCallable(functions, 'verifyMemberBeforeOtp')
export const createRegistrationOrder = httpsCallable(functions, 'createRegistrationOrder')
export const requestReceiptDownload = httpsCallable(functions, 'requestReceiptDownload')

export function setupRecaptcha(containerId) {
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
}

export function sendOtp(phoneNumber, appVerifier) {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier)
}
