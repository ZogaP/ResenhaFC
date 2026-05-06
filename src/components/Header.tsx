"use client";

import React from 'react';
import Link from 'next/link';
import { HelpCircle, User, Settings, Search, MapPin, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileMenu from './ProfileMenu';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, profile } = useAuth();
  const [showMenu, setShowMenu] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const router = useRouter();
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Search Logic
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        try {
          const lowerSearch = searchTerm.toLowerCase();
          
          // Search Users
          const userSnap = await getDocs(query(
            collection(db, 'users'),
            limit(10)
          ));
          const userResults = userSnap.docs
            .map(doc => ({ id: doc.id, type: 'user', ...doc.data() }))
            .filter((u: any) => 
              u.name?.toLowerCase().includes(lowerSearch) || 
              u.username?.toLowerCase().includes(lowerSearch)
            );

          // Search Matches
          const matchSnap = await getDocs(query(
            collection(db, 'matches'),
            orderBy('createdAt', 'desc'),
            limit(20)
          ));
          
          const isAdmin = profile?.role === 'admin';
          const matchResults = matchSnap.docs
            .map(doc => ({ id: doc.id, type: 'match', ...doc.data() }))
            .filter((m: any) => {
              const matchesSearch = m.location?.toLowerCase().includes(lowerSearch) || m.address?.toLowerCase().includes(lowerSearch);
              if (!matchesSearch) return false;

              // Privacy Filter
              const isCreator = m.createdBy === user?.uid;
              const isParticipant = (m.participants || []).some((p: any) => p.uid === user?.uid);
              const isInvitee = (m.invitedUids || []).includes(user?.uid) || (m.invitedEmails || []).includes(user?.email);
              
              return !m.visibility || m.visibility === 'publica' || isCreator || isParticipant || isInvitee || isAdmin;
            });

          setResults([...userResults, ...matchResults]);
          setShowResults(true);
        } catch (e) {
          console.error("Search error:", e);
        }
        setIsSearching(false);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Click outside to close results
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: any) => {
    setSearchTerm('');
    setShowResults(false);
    if (item.type === 'user') router.push(`/perfil/${item.id}`);
    else router.push(`/partida/${item.id}`);
  };

  return (
    <header className="fixed-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      gap: '20px'
    }}>
      <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/logo.png" alt="LineUp" style={{ height: '32px', width: 'auto' }} />
        <h1 className="logo-text" style={{ fontSize: '1.2rem', margin: 0 }}>
          LineUp
        </h1>
      </Link>

      {/* Global Search Bar - only after login */}
      {profile && <div ref={searchRef} style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} />
          <input 
            type="text"
            placeholder="Buscar jogadores ou peladas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
            style={{
              width: '100%',
              padding: '10px 15px 10px 38px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
          {isSearching && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }}
            />
          )}
        </div>

        {/* Results Dropdown */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                maxHeight: '350px',
                overflowY: 'auto',
                zIndex: 1000,
                padding: '8px'
              }}
            >
              {results.length > 0 ? (
                results.map((item, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSelect(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    className="search-item-hover"
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {item.type === 'user' ? (
                        <img src={item.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <MapPin size={16} color="var(--primary)" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '800', margin: 0 }}>{item.name || item.location}</p>
                      <p style={{ fontSize: '10px', color: 'var(--secondary)', margin: 0 }}>
                        {item.type === 'user' ? `@${item.username || 'jogador'}` : `${item.date} • ${item.time}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', padding: '15px', color: 'var(--secondary)', fontSize: '12px' }}>
                  Nenhum resultado encontrado para "{searchTerm}"
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
        {profile && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowMenu(true)}
              style={{ 
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid var(--primary)',
                background: 'var(--surface)',
                padding: 0,
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <img 
                src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} 
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {profile.friendRequests && profile.friendRequests.length > 0 && (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '2px solid var(--background)',
                    zIndex: 2
                  }}
                />
              )}
            </button>
            <ProfileMenu show={showMenu} onClose={() => setShowMenu(false)} />
          </div>
        )}
      </div>

      <style jsx>{`
        .search-item-hover:hover {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </header>
  );
}
