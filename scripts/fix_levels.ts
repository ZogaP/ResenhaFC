import { collection, getDocs, orderBy, query, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function fix() {
  const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return console.log('No match');
  
  const match = snap.docs[0];
  const data = match.data();
  console.log('Match ID:', match.id);
  
  let updated = false;
  const newParticipants = await Promise.all(data.participants.map(async (p: any) => {
    if (p.isGuest) {
      p.overall = 50;
      p.attributes = {velocidade:50, defesa:50, passe:50, ataque:50, fisico:50, finalizacao:50};
      updated = true;
      return p;
    } else {
      const userSnap = await getDoc(doc(db, 'users', p.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        p.overall = userData.overall || 50;
        p.attributes = userData.attributes || p.attributes;
        updated = true;
      }
      return p;
    }
  }));
  
  if (updated) {
    await updateDoc(doc(db, 'matches', match.id), { participants: newParticipants });
    console.log('Fixed participants!');
  } else {
    console.log('Nothing to fix');
  }
  process.exit(0);
}

fix();
