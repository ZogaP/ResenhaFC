const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, updateDoc, arrayUnion } = require('firebase/firestore');

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

async function addAllUsersToMatch() {
  // 1. Get the scheduled match
  const matchesSnap = await getDocs(query(collection(db, 'matches'), where('status', '==', 'scheduled')));
  if (matchesSnap.empty) {
    console.log("No scheduled match found. Please create one first.");
    return;
  }
  const matchDoc = matchesSnap.docs[0];
  const matchId = matchDoc.id;
  const matchData = matchDoc.data();
  console.log(`Adding users to match: ${matchId} (${matchData.location})`);

  // 2. Get all users
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
  console.log(`Found ${users.length} total users.`);

  // 3. Prepare participant objects
  const participants = users.map(u => ({
    uid: u.uid || u.id,
    name: u.name || 'Jogador',
    photoURL: u.photoURL || '',
    overall: u.overall || 50,
    position: u.position || 'MEI',
    paymentStatus: 'pending'
  }));

  // 4. Update match
  // We use the whole list to replace or arrayUnion.
  // The user said "adicione todos", so I'll just set the participants list.
  await updateDoc(doc(db, 'matches', matchId), {
    participants: participants
  });

  console.log(`Success! Added ${participants.length} players to the match.`);
}

addAllUsersToMatch().catch(console.error);
