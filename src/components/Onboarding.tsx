/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, Bell, Calendar as CalendarIcon, User, ShieldCheck, ChevronRight } from 'lucide-react';
import { AppMode, ReminderSettings } from '../types';
import { useAuth } from './AuthProvider';
import { handleFirestoreError, OperationType } from '../firebaseUtils';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface OnboardingProps {
  onComplete: () => void;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  reminders: ReminderSettings;
  setReminders: (reminders: ReminderSettings) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ 
  onComplete, 
  mode, 
  setMode,
  reminders,
  setReminders
}) => {
  const { user, signIn, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [linkingCode, setLinkingCode] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🐰');

  const AVATARS = ['🐰', '🐱', '🦊', '🐼', '🐨', '🐻', '🐶', '🐹', '🐸'];

  useEffect(() => {
    if (user && step === 0) setStep(1);
    if (!user && step > 0) setStep(0);
  }, [user, step]);

  const nextStep = () => {
    if (step === 1 && !username.trim()) {
      alert("Please enter a username.");
      return;
    }
    if (step === 2 && mode === 'hubby' && !linkingCode.trim()) {
      alert("Please enter a link code to connect with your partner.");
      return;
    }
    setStep(prev => Math.min(prev + 1, 4));
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const modes: { id: AppMode; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'solo', title: 'Solo', desc: 'Focus on personal wellness', icon: <User className="w-5 h-5" /> },
    { id: 'wifey', title: 'Wifey', desc: 'Track for myself, share info easily', icon: <Heart className="w-5 h-5" /> },
    { id: 'hubby', title: 'Hubby', desc: 'Support my partner', icon: <ShieldCheck className="w-5 h-5" /> }
  ];

  const handleReminderToggle = (key: 'logSymptoms' | 'periodStart' | 'wellness') => {
    setReminders({
      ...reminders,
      [key]: { ...reminders[key], enabled: !reminders[key].enabled }
    });
  };

  const handleComplete = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const payload: any = {
        userId: user.uid,
        email: user.email || '',
        mode,
        username: username.trim(),
        avatar,
        updatedAt: serverTimestamp()
      };
      
      if (!userSnap.exists()) {
        payload.createdAt = serverTimestamp();
      }
      
      if (mode === 'hubby') {
        payload.linkedUserId = linkingCode.trim();
      }
      
      await setDoc(userRef, payload, { merge: true });
      onComplete();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col sm:justify-center">
      <div className="flex-1 w-full max-w-md mx-auto bg-white sm:rounded-[40px] sm:h-[800px] shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 z-10">
          <motion.div 
            className="h-full bg-rose-500"
            initial={{ width: '0%' }}
            animate={{ width: step > 0 ? `${(step / 4) * 100}%` : '0%' }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-8 pt-20 pb-8 no-scrollbar">
          <AnimatePresence mode="wait">
            
            {/* Step 0: Login */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center h-full pt-12"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-rose-50 rounded-[32px] flex items-center justify-center mb-8 rotate-3">
                  <Heart className="w-10 h-10 text-rose-500" />
                </div>
                <h1 className="text-4xl font-display font-bold text-gray-900 mb-4 tracking-tight">Meet Tsuki</h1>
                <p className="text-gray-500 leading-relaxed mb-12">
                  A modern cycle tracker for you and your partner. Securely sync and understand your body's rhythm.
                </p>
                <div className="mt-auto w-full">
                  <button 
                    onClick={signIn}
                    className="w-full py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <title>Sign in with Google</title>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                  <p className="text-[10px] text-gray-400 font-medium mt-6 uppercase tracking-wider">Secure and Private</p>
                </div>
              </motion.div>
            )}
            
            {/* Step 1: Profile */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <div className="text-center mb-8 pt-4">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your profile</h2>
                  <p className="text-gray-500">Pick a cute avatar and tell us your name.</p>
                </div>
                
                <div className="mb-8">
                  <label className="block text-sm font-bold text-gray-900 mb-4 text-center">Choose an Avatar</label>
                  <div className="grid grid-cols-3 gap-4 justify-items-center">
                    {AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setAvatar(emoji)}
                        className={`text-4xl p-2 rounded-[24px] transition-all transform ${avatar === emoji ? 'bg-indigo-50 ring-2 ring-indigo-500 scale-110 shadow-sm' : 'bg-transparent hover:bg-gray-50 hover:scale-105 filter grayscale opacity-60'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Tsuki"
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 font-bold focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all text-center text-lg placeholder-gray-300"
                  />
                </div>

                <div className="mt-auto w-full pt-8 flex gap-3">
                  <button 
                    onClick={nextStep}
                    disabled={!username.trim()}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Step 2: Modes */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-rose-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Sparkles className="w-8 h-8 text-rose-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">How will you use Tsuki?</h2>
                  <p className="text-gray-500">Choose a perspective to tailor the insights and advice.</p>
                </div>
                
                <div className="space-y-4">
                  {modes.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`w-full p-6 rounded-3xl border-2 text-left transition-all flex items-start gap-4 ${
                        mode === m.id 
                          ? 'border-gray-900 bg-gray-900 text-white shadow-xl scale-[1.02]' 
                          : 'border-gray-100 bg-white hover:border-gray-200 text-gray-900'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${mode === m.id ? 'bg-white/10' : 'bg-gray-50'}`}>
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold mb-1 ${mode === m.id ? 'text-white' : 'text-gray-900'}`}>{m.title}</h3>
                        <p className={`text-sm ${mode === m.id ? 'text-gray-300' : 'text-gray-500'}`}>{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {mode === 'hubby' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl">
                        <h4 className="font-bold text-indigo-900 mb-2">Partner Link Code</h4>
                        <p className="text-xs text-indigo-700 mb-4 leading-relaxed">
                          Ask your partner for her Link Code (found in her settings) to securely connect your accounts.
                        </p>
                        <input
                          type="text"
                          value={linkingCode}
                          onChange={(e) => setLinkingCode(e.target.value)}
                          placeholder="Paste Link Code here"
                          className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white text-indigo-900 font-mono text-sm placeholder-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-auto w-full pt-8 flex gap-3">
                  <button onClick={prevStep} className="py-4 px-6 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-colors">
                    Back
                  </button>
                  <button 
                    onClick={() => {
                        if (mode === 'hubby' && !linkingCode.trim()) {
                            alert("Please enter a link code to connect with your partner.");
                            return;
                        }
                        setStep(3);
                    }}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Notifications & Setup */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Gentle Reminders</h2>
                <p className="text-gray-500 mb-8">We can gently nudge you when it's time to log or prepare for your next phase.</p>

                <div className="space-y-4">
                  {[
                    { key: 'logSymptoms', label: 'Daily Symptom Log', desc: 'A reminder to log your daily feelings', icon: <Heart className="w-5 h-5 text-rose-500"/>, color: 'bg-rose-50' },
                    { key: 'periodStart', label: 'Period Prediction', desc: 'Get a heads-up before it starts', icon: <CalendarIcon className="w-5 h-5 text-indigo-500"/>, color: 'bg-indigo-50' },
                    { key: 'wellness', label: 'Wellness Insights', desc: 'Tips specific to your cycle phase', icon: <Sparkles className="w-5 h-5 text-emerald-500"/>, color: 'bg-emerald-50' }
                  ].map((item) => (
                    <div key={item.key} className="p-5 rounded-3xl border border-gray-100 flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${item.color}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-gray-900">{item.label}</h3>
                        <p className="text-[11px] text-gray-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleReminderToggle(item.key as any)}
                        className={`w-12 h-7 rounded-full relative transition-all ${reminders[item.key as 'logSymptoms' | 'periodStart' | 'wellness'].enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${reminders[item.key as 'logSymptoms' | 'periodStart' | 'wellness'].enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-2xl text-center">
                  <Bell className="w-5 h-5 mx-auto text-gray-400 mb-2" />
                  <p className="text-[11px] text-gray-500 font-medium">You can customize the exact timing of these reminders later in your settings.</p>
                </div>

                <div className="mt-auto w-full pt-8 flex gap-3">
                  <button onClick={prevStep} className="py-4 px-6 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-colors">
                    Back
                  </button>
                  <button 
                    onClick={nextStep}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Final Tips / Completion */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full text-center items-center justify-center pt-8"
              >
                <div className="w-24 h-24 bg-gray-900 rounded-[32px] flex items-center justify-center mb-8 rotate-3 shadow-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">You're all set!</h2>
                <p className="text-gray-500 mb-12">
                  Tap the <strong className="text-rose-500">Calendar</strong> tab to select the start of your last period, and Tsuki will start learning your cycle.
                </p>

                <div className="w-full space-y-3">
                  <button 
                    onClick={handleComplete}
                    className="w-full py-4 bg-rose-500 text-white shadow-xl shadow-rose-200 rounded-2xl font-bold text-lg hover:bg-rose-600 active:scale-95 transition-all"
                  >
                    Enter App
                  </button>
                  <button onClick={prevStep} className="w-full py-3 text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors">
                    Go Back
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
