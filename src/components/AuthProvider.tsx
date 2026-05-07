/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  partnerProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  partnerProfile: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubsProfile: (() => void) | undefined;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          unsubsProfile = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile(null);
            }
          });
        } catch (error) {
          console.error("Error fetching user profile", error);
        }
      } else {
        setProfile(null);
        setPartnerProfile(null);
        if (unsubsProfile) {
          unsubsProfile();
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubsProfile) {
        unsubsProfile();
      }
    };
  }, []);

  useEffect(() => {
    let unsubsPartner: (() => void) | undefined;
    if ((profile?.mode === 'hubby' || profile?.mode === 'boyfriend' as any) && profile?.linkedUserId) {
      try {
        const partnerRef = doc(db, 'users', profile.linkedUserId);
        unsubsPartner = onSnapshot(partnerRef, (docSnap) => {
          if (docSnap.exists()) {
            setPartnerProfile(docSnap.data() as UserProfile);
          } else {
            setPartnerProfile(null);
          }
        }, (error) => {
            console.error("Error connecting to partner profile: ", error);
            setPartnerProfile(null);
        });
      } catch (e) {
        console.error("Error fetching partner", e);
      }
    } else {
      setPartnerProfile(null);
    }
    return () => {
      if (unsubsPartner) unsubsPartner();
    };
  }, [profile?.mode, profile?.linkedUserId]);

  const signIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      alert('Error signing in. Please check if popups are allowed or try opening in a new tab.');
      setLoading(false);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, partnerProfile, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};
