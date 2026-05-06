import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

async function migrate() {
  const matchId = "V4CZX1uLiIxh6zNOoSDq";
  const groupId = "b3AJQm4RtYUXMHiXm7UW";

  const matchSnap = await getDoc(doc(db, 'matches', matchId));
  const groupSnap = await getDoc(doc(db, 'groups', groupId));

  if (!matchSnap.exists() || !groupSnap.exists()) {
    console.log("Match or Group not found");
    return;
  }

  const matchData = matchSnap.data();
  const groupData = groupSnap.data();
  
  const participants = matchData.participants || [];
  const currentMemberIds = groupData.memberIds || [];
  
  const newMembers: any[] = [];
  const newMemberIds: string[] = [];

  participants.forEach((p: any) => {
    if (!currentMemberIds.includes(p.uid)) {
      const name = p.name.toLowerCase();
      const isGuest = name.includes('marcel') || name.includes('leandro');
      
      const member = {
        uid: p.uid,
        name: p.name,
        photoURL: p.photoURL || '',
        role: 'player',
        type: isGuest ? 'avulso' : 'mensalista'
      };
      
      newMembers.push(member);
      newMemberIds.push(p.uid);
      console.log(`Adding ${p.name} as ${isGuest ? 'avulso' : 'mensalista'}`);
    } else {
      console.log(`${p.name} already in group`);
    }
  });

  if (newMembers.length > 0) {
    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(...newMembers),
      memberIds: arrayUnion(...newMemberIds)
    });
    console.log("Migration complete!");
  } else {
    console.log("No new members to add.");
  }
}

migrate();
