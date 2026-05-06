import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function cleanup() {
  const q = query(collection(db, 'users'), where('username', '==', 'jogador'));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("Usuário não encontrado.");
    return;
  }

  for (const d of snap.docs) {
    const data = d.data();
    console.log(`Deletando: ${d.id} - ${data.name} (${data.email})`);
    await deleteDoc(doc(db, 'users', d.id));
  }
  console.log("Concluído.");
}

cleanup();
