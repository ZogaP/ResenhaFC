"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserAttributes {
  // Field Players
  velocidade: number;
  finalizacao: number;
  passe: number;
  drible: number;
  defesa: number;
  fisico: number;
  // Goalkeeper Specific
  elasticidade?: number;
  manejo?: number;
  reflexo?: number;
  posicionamento?: number;
}

interface Highlight {
  id: string;
  url: string;
  description: string;
}

export type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PON' | 'CA';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  overall: number;
  attributes: UserAttributes;
  isAdmin: boolean;
  totalGames: number;
  confirmedGames: number;
  position?: PlayerPosition;
  profileSetup?: boolean;
  highlights?: Highlight[];
  // Personal Data
  birthDate?: string;
  role?: 'admin' | 'player';
  altura?: number;
  chuteira?: number;
  peso?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  setProfile: () => {},
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || 'Jogador',
            email: user.email || '',
            photoURL: user.photoURL || '',
            overall: 50,
            attributes: {
              velocidade: 50, defesa: 50, passe: 50, drible: 50, fisico: 50, finalizacao: 50,
            },
            isAdmin: false,
            totalGames: 0,
            confirmedGames: 0,
            position: 'MEI',
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
