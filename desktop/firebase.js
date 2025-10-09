import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFirestore, collection } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAVxCQijUicaV6aOpZcA4rC8k4hcqoSekQ",
  authDomain: "file-manager-5acb8.firebaseapp.com",
  projectId: "file-manager-5acb8",
  storageBucket: "file-manager-5acb8.firebasestorage.app",
  messagingSenderId: "856728563061",
  appId: "1:856728563061:web:d1984812507353e522373c",
  measurementId: "G-NJS0V1FGSN"
};

const app = initializeApp(firebaseConfig)
const firestore = getFirestore(app)

export const database = {
  files: collection(firestore, "files")
}
export const storage = getStorage(app)
export const auth = getAuth(app)
export default app
