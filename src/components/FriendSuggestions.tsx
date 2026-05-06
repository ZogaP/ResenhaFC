"use client";

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Search, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  collection, query, where, getDocs, limit, 
  doc, updateDoc, arrayUnion, arrayRemove, onSnapshot 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function FriendSuggestions() {
  const { user, profile } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchSuggestions = async () => {
      try {
        const myFriends = profile.friends || [];
        const myReceived = profile.friendRequests || [];
        const mySent = profile.friendRequestsSent || [];
        const myUid = user.uid;
        const suggestionsSet = new Set<string>();

        // 1. Get Friends of Friends
        if (myFriends.length > 0) {
          const friendsQuery = query(collection(db, 'users'), where('uid', 'in', myFriends.slice(0, 10)));
          const friendsSnap = await getDocs(friendsQuery);
          
          friendsSnap.docs.forEach(doc => {
            const friendData = doc.data();
            (friendData.friends || []).forEach((fofUid: string) => {
              if (
                fofUid !== myUid && 
                !myFriends.includes(fofUid) && 
                !myReceived.includes(fofUid) && 
                !mySent.includes(fofUid)
              ) {
                suggestionsSet.add(fofUid);
              }
            });
          });
        }

        let fofProfiles: any[] = [];
        if (suggestionsSet.size > 0) {
          const fofList = Array.from(suggestionsSet).slice(0, 10);
          const fofQuery = query(collection(db, 'users'), where('uid', 'in', fofList));
          const fofSnap = await getDocs(fofQuery);
          fofProfiles = fofSnap.docs.map(doc => ({ uid: doc.id, ...doc.data(), isFOF: true }));
        }

        // 2. Global Suggestions
        const globalQuery = query(collection(db, 'users'), limit(50));
        const globalSnap = await getDocs(globalQuery);
        const globalUsers = globalSnap.docs
          .map(doc => ({ uid: doc.id, ...doc.data() }))
          .filter((u: any) => 
            u.uid !== myUid && 
            !myFriends.includes(u.uid) && 
            !myReceived.includes(u.uid) && 
            !mySent.includes(u.uid) &&
            !suggestionsSet.has(u.uid)
          );

        // Mix them: FOF first
        const combined = [...fofProfiles, ...globalUsers].slice(0, 10);
        setSuggestions(combined);
      } catch (e) {
        console.error("Error fetching suggestions:", e);
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, [user, profile]);

  const handleAddFriend = async (targetUid: string) => {
    if (!user || !profile) return;
    
    try {
      const targetRef = doc(db, 'users', targetUid);
      const myRef = doc(db, 'users', user.uid);

      // 1. Add my UID to their friendRequests
      await updateDoc(targetRef, {
        friendRequests: arrayUnion(user.uid)
      });

      // 2. Add their UID to my friendRequestsSent
      await updateDoc(myRef, {
        friendRequestsSent: arrayUnion(targetUid)
      });

      setSentRequests(prev => [...prev, targetUid]);
    } catch (e) {
      alert("Erro ao enviar pedido.");
    }
  };

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 4px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Pessoas que você talvez conheça
        </h3>
        <Search size={14} color="var(--secondary)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px', marginLeft: '-4px', paddingLeft: '4px' }} className="custom-scroll">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ width: '130px', height: '160px', background: 'var(--surface)', borderRadius: '20px', animation: 'pulse 1.5s infinite' }} />
          ))
        ) : (
          suggestions.map((u) => (
            <motion.div
              key={u.uid}
              whileTap={{ scale: 0.95 }}
              className="glass"
              style={{ 
                flexShrink: 0, 
                width: '130px', 
                padding: '16px', 
                borderRadius: '24px', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                  <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                {(u.overall >= 80) && (
                  <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--primary)', color: 'black', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid black' }}>
                    ★
                  </div>
                )}
              </div>

              <p style={{ fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', marginBottom: '4px' }}>
                {u.name.split(' ')[0]}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--secondary)', marginBottom: '12px' }}>
                {u.isFOF ? '🤝 Amigo em comum' : `@${u.username || 'jogador'}`}
              </p>

              <button
                disabled={sentRequests.includes(u.uid)}
                onClick={() => handleAddFriend(u.uid)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '12px', 
                  background: sentRequests.includes(u.uid) ? 'var(--surface)' : 'var(--primary-gradient)', 
                  color: sentRequests.includes(u.uid) ? 'var(--secondary)' : 'black',
                  fontSize: '10px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                {sentRequests.includes(u.uid) ? (
                  <><UserCheck size={12} /> ENVIADO</>
                ) : (
                  <><UserPlus size={12} /> ADICIONAR</>
                )}
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
