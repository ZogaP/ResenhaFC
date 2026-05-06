import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function list() {
  const mSnap = await getDocs(collection(db, 'matches'));
  mSnap.forEach(doc => {
    console.log(`ID: ${doc.id} | Location: ${doc.data().location} | Date: ${doc.data().date}`);
  });
  
  const gSnap = await getDocs(collection(db, 'groups'));
  gSnap.forEach(doc => {
    console.log(`GroupID: ${doc.id} | Name: ${doc.data().name}`);
  });
}

list();
