import { db } from '../lib/firebase';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';

async function link() {
  const matchId = "V4CZX1uLiIxh6zNOoSDq";
  const groupId = "b3AJQm4RtYUXMHiXm7UW";

  console.log("Linking match:", matchId, "to group:", groupId);

  // 3. Link them
  await updateDoc(doc(db, 'matches', matchId), { groupId: groupId });
  await updateDoc(doc(db, 'groups', groupId), { 
    matches: arrayUnion(matchId)
  });

  console.log("Successfully linked!");
}

link();
