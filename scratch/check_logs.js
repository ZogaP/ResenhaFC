const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD5L-ErxdpZLm-nhPNqyfEN4UX0o1sVPEQ",
  authDomain: "futebol-7593e.firebaseapp.com",
  projectId: "futebol-7593e",
  storageBucket: "futebol-7593e.firebasestorage.app",
  messagingSenderId: "121417480379",
  appId: "1:121417480379:web:31bc216716fab2b095d19e",
  measurementId: "G-06HYF864XE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const collections = ['notifications', 'activities', 'presence', 'history', 'logs'];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`Collection ${col}:`, snap.size, 'documents');
    } catch (e) {
      console.log(`Collection ${col} not found or error.`);
    }
  }
}

check().catch(console.error);
