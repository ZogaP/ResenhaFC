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
  console.log('Checking matches in futebol-7593e...');
  const snap = await getDocs(collection(db, 'matches'));
  console.log('Matches found:', snap.size);
  snap.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Status:', doc.data().status);
    console.log('Location:', doc.data().location);
    console.log('Date:', doc.data().date);
    console.log('-------------------');
  });
}

check().catch(console.error);
