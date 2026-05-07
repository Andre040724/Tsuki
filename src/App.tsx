/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  User, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Flame, 
  Leaf, 
  Coffee, 
  Utensils, 
  Sparkles,
  ChevronRight,
  Settings,
  Calendar as CalendarIcon,
  Home,
  Plus,
  History as HistoryIcon,
  Trash2,
  CalendarDays,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Link,
  CheckCircle,
} from 'lucide-react';
import { phaseInsights } from './data/phaseInsights';
import { AppMode, CyclePhase, SymptomLog, ReminderSettings } from './types';
import { useCycleData } from './hooks/useCycleData';
import { Calendar } from './components/Calendar';
import { SymptomLogger } from './components/SymptomLogger';
import { CycleDataViz } from './components/CycleDataViz';
import { AIInsightCard } from './components/AIInsightCard';
import { PhaseForecast } from './components/PhaseForecast';
import { Onboarding } from './components/Onboarding';
import { useAuth } from './components/AuthProvider';
import { auth, db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebaseUtils';
import { format, startOfDay } from 'date-fns';

const TIMEZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [Intl.DateTimeFormat().resolvedOptions().timeZone];

const GROUPED_TIMEZONES = TIMEZONES.reduce((acc, tz) => {
  const region = tz.includes('/') ? tz.split('/')[0] : 'Other';
  if (!acc[region]) acc[region] = [];
  acc[region].push(tz);
  return acc;
}, {} as Record<string, string[]>);

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return {
    value: `${h.toString().padStart(2, '0')}:${m}`,
    label: `${hour12}:${m} ${ampm}`
  };
});

const formatTime12h = (timeStr: string) => {
  if (!timeStr) return '';
  const option = TIME_OPTIONS.find(opt => opt.value === timeStr);
  return option ? option.label : timeStr;
};

export default function App() {
  const { user, profile, partnerProfile, loading } = useAuth();
  const [mode, setMode] = useState<AppMode>('wifey');

  useEffect(() => {
    if (profile?.mode) {
      if (profile.mode === 'girlfriend' as any) setMode('wifey');
      else if (profile.mode === 'boyfriend' as any) setMode('hubby');
      else setMode(profile.mode);
    }
  }, [profile?.mode]);

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'calendar' | 'history' | 'wellness'>('calendar');
  const [historySubTab, setHistorySubTab] = useState<'cycles' | 'symptoms'>('cycles');
  const [selectedSymptomDate, setSelectedSymptomDate] = useState<Date | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<{ start: Date; end?: Date } | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('🐰');
  const [editMode, setEditMode] = useState<AppMode>('wifey');
  const [editLinkedUserId, setEditLinkedUserId] = useState('');

  const handleEditProfileSave = async () => {
    if (!user) return;
    if (editMode === 'hubby' && !editLinkedUserId.trim()) {
      alert("Please enter a link code.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const payload: any = {
        username: editUsername.trim(),
        avatar: editAvatar,
        mode: editMode,
        updatedAt: serverTimestamp()
      };
      if (editMode === 'hubby') {
        payload.linkedUserId = editLinkedUserId.trim();
      }
      await updateDoc(userRef, payload);
      setIsEditingProfile(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const targetUserId = mode === 'hubby' ? profile?.linkedUserId : user?.uid;
  const { 
    records,
    history,
    symptoms,
    toggleDate,
    deleteRecord,
    logSymptom,
    getPhaseForDate,
    getRecordForDate,
    predictedNextPeriod, 
    predictedOvulation,
    weightedPeriodLength,
    averageCycleLength,
    currentPhase,
    reminders,
    setReminders,
    partnerNote,
    setPartnerNote,
    deleteSymptom
  } = useCycleData(targetUserId);

  const handleReminderToggle = (key: keyof ReminderSettings) => {
    setReminders({
      ...reminders,
      [key]: { ...reminders[key], enabled: !reminders[key].enabled }
    });
  };

  const handleReminderTime = (key: 'logSymptoms' | 'periodStart' | 'wellness', time: string) => {
    setReminders({
      ...reminders,
      [key]: { ...reminders[key], time }
    });
  };

  const handleTimezoneChange = (timezone: string) => {
    setReminders({
      ...reminders,
      timezone
    });
  };

  const handleDateClick = (date: Date) => {
    const existingRecord = getRecordForDate(date);
    if (existingRecord) {
      setConfirmDeleteRecord(existingRecord);
    } else {
      toggleDate(date);
    }
  };

  const activeInsight = useMemo(() => phaseInsights[currentPhase], [currentPhase]);

  const modeConfig: Record<string, any> = {
    hubby: {
      icon: <Heart className="w-5 h-5" />,
      label: "Hubby",
      color: "bg-blue-500",
      textColor: "text-blue-600",
      accentColor: "bg-blue-50",
    },
    wifey: {
      icon: <Sparkles className="w-5 h-5" />,
      label: "Wifey",
      color: "bg-rose-500",
      textColor: "text-rose-600",
      accentColor: "bg-rose-50",
    },
    solo: {
      icon: <User className="w-5 h-5" />,
      label: "Solo",
      color: "bg-indigo-500",
      textColor: "text-indigo-600",
      accentColor: "bg-indigo-50",
    }
  };
  const currentConfig = modeConfig[mode] || modeConfig['wifey'];

  const phases: { id: CyclePhase; label: string; icon: ReactNode; color: string }[] = [
    { id: 'menstruation', label: 'Menstruation', icon: <Moon className="w-4 h-4" />, color: 'bg-rose-400' },
    { id: 'follicular', label: 'Follicular', icon: <Leaf className="w-4 h-4" />, color: 'bg-emerald-400' },
    { id: 'ovulation', label: 'Ovulation', icon: <Flame className="w-4 h-4" />, color: 'bg-orange-400' },
    { id: 'luteal', label: 'Luteal', icon: <Sun className="w-4 h-4" />, color: 'bg-blue-400' },
  ];

  const getPhaseTitle = () => {
    if (mode === 'hubby') return activeInsight.hubbyPhaseTitle;
    if (mode === 'wifey') return activeInsight.wifeyPhaseTitle;
    return activeInsight.soloPhaseTitle;
  };

  const getPhaseContent = () => {
    if (mode === 'hubby') return activeInsight.hubbyAdvice;
    if (mode === 'wifey') return activeInsight.wifeyInsight;
    return activeInsight.soloInsight;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex text-rose-500 justify-center items-center bg-gray-50">
        <Sparkles className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <Onboarding 
        mode={mode} 
        setMode={setMode} 
        reminders={reminders} 
        setReminders={setReminders}
        onComplete={() => {
          // Profile will be re-fetched automatically via useAuth onSnapshot
        }}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans transition-colors duration-500 selection:bg-rose-100 selection:text-rose-900 bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-white/20 transition-colors duration-500">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500">
            <Moon className="w-4 h-4 text-white fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-display">Tsuki</h1>
        </div>
        
        <button 
          id="settings-trigger"
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 transition-colors rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-xl px-6 pt-24 pb-32 mx-auto">
        {/* User Greeting */}
        {!showSettings && (
          <div className="mb-8 transition-all">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-3">
              <div className="flex items-center">
                <span className="text-4xl bg-white w-14 h-14 flex items-center justify-center rounded-[20px] shadow-sm border border-gray-100 z-10">{profile.avatar || '🐰'}</span> 
                {mode === 'hubby' && partnerProfile && (
                  <span className="text-4xl bg-white w-14 h-14 flex items-center justify-center rounded-[20px] shadow-sm border border-gray-100 -ml-4 z-0">{partnerProfile.avatar || '🐰'}</span>
                )}
              </div>
              <span className="flex flex-col">
                <span className="text-sm font-normal text-gray-500">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                </span>
                <span>
                  {profile.username || 'User'}
                  {mode === 'hubby' && partnerProfile && ` & ${partnerProfile.username || 'Partner'}`}
                  !
                </span>
              </span>
            </h2>
          </div>
        )}

        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 py-6 mb-8 bg-white rounded-[32px] shadow-2xl border border-gray-100 transition-colors duration-500 overflow-hidden shadow-gray-200/50"
            >
              <div className="space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Account</h3>
                  </div>
                  {isEditingProfile ? (
                    <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-100 flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Avatar</label>
                        <div className="grid grid-cols-5 gap-2">
                            {['🐰', '🐱', '🦊', '🐼', '🐨', '🐻', '🐶', '🐹', '🐸'].map(a => (
                                <button
                                    key={a}
                                    onClick={() => setEditAvatar(a)}
                                    className={`text-2xl p-2 rounded-xl transition-all ${editAvatar === a ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110 shadow-sm' : 'bg-transparent hover:bg-gray-200 opacity-60'}`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                        <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="Your Name"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">App Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(modeConfig) as AppMode[]).map((m) => (
                            <button
                              key={m}
                              onClick={() => setEditMode(m)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${
                                editMode === m 
                                  ? `${modeConfig[m].accentColor} ${modeConfig[m].textColor} border-transparent ring-2 ring-inset ring-current` 
                                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {modeConfig[m].icon}
                              <span className="text-[10px] font-bold uppercase tracking-tight">{modeConfig[m].label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {editMode === 'hubby' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Partner's Link Code</label>
                          <input
                            type="text"
                            value={editLinkedUserId}
                            onChange={(e) => setEditLinkedUserId(e.target.value)}
                            placeholder="Enter your partner's code"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleEditProfileSave}
                          disabled={!editUsername.trim() || isSavingProfile}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
                        >
                          {isSavingProfile ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl text-2xl ${currentConfig.accentColor}`}>
                          {profile.avatar || '🐰'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{profile.username || user?.email}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Mode: {currentConfig.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditAvatar(profile.avatar || '🐰');
                            setEditUsername(profile.username || '');
                            let finalMode = profile.mode || 'wifey';
                            if (finalMode === 'girlfriend' as any) finalMode = 'wifey';
                            if (finalMode === 'boyfriend' as any) finalMode = 'hubby';
                            setEditMode(finalMode);
                            setEditLinkedUserId(profile.linkedUserId || '');
                            setIsEditingProfile(true);
                          }} 
                          className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                        >
                          Edit Profile
                        </button>
                        <button 
                          onClick={() => auth.signOut()} 
                          className="px-4 py-2 text-xs font-bold text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-4 text-xs font-bold text-gray-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Reminders
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'logSymptoms' as const, label: 'Daily Symptom Log', desc: 'Remind me to log my status' },
                      { key: 'periodStart' as const, label: 'Period Prediction', desc: 'Alert before cycle starts' },
                      { key: 'wellness' as const, label: 'Wellness Rituals', desc: 'Phase-specific self care' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="p-4 bg-gray-50 rounded-[24px] flex items-center justify-between group transition-all border border-transparent hover:bg-white hover:shadow-sm hover:border-gray-100">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">{label}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{desc}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {reminders[key].enabled && (
                            <select
                              value={reminders[key].time}
                              onChange={(e) => handleReminderTime(key, e.target.value)}
                              className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-rose-200 transition-colors cursor-pointer"
                            >
                              {TIME_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => handleReminderToggle(key)}
                            className={`w-10 h-6 rounded-full relative transition-all ${reminders[key].enabled ? 'bg-rose-500' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${reminders[key].enabled ? 'left-5' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-[24px] flex items-center justify-between transition-all border border-transparent hover:bg-white hover:shadow-sm hover:border-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Timezone / Country</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Align reminders to your location</p>
                    </div>
                    <select
                      value={reminders.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                      onChange={(e) => handleTimezoneChange(e.target.value)}
                      className="text-[10px] max-w-[120px] font-bold px-2 py-1 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-rose-200 transition-colors cursor-pointer"
                    >
                      {Object.entries(GROUPED_TIMEZONES).map(([region, tzs]) => (
                        <optgroup key={region} label={region}>
                          {tzs.map(tz => (
                            <option key={tz} value={tz}>
                              {tz.split('/').slice(1).join('/') || tz}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Link className="w-5 h-5 text-indigo-500" />
                    Partner Connection
                  </h3>
                  {mode === 'wifey' ? (
                    <div className="bg-indigo-50 rounded-[24px] p-5 border border-indigo-100">
                      <p className="text-sm font-bold text-indigo-900 mb-2">Your Link Code</p>
                      <p className="text-[11px] text-indigo-700 mb-3 leading-relaxed">Share this code with your hubby so he can connect his app to your cycle.</p>
                      <div className="bg-white rounded-xl p-3 flex justify-between items-center border border-indigo-200">
                        <code className="text-indigo-600 font-bold text-xs select-all text-xs truncate mr-2">{user?.uid}</code>
                        <button 
                          onClick={() => {
                            if (user?.uid) navigator.clipboard.writeText(user.uid);
                            alert('Copied to clipboard!');
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ) : mode === 'hubby' ? (
                    <div className="bg-indigo-50 rounded-[24px] p-5 border border-indigo-100">
                      <p className="text-sm font-bold text-indigo-900 mb-2">Connection Status</p>
                      {partnerProfile ? (
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-200">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{partnerProfile.avatar || '🐰'}</div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{partnerProfile.username || 'Partner'}</p>
                              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Linked</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
                          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                          <p className="text-sm font-bold text-gray-900">Not Linked Yet</p>
                          <p className="text-[10px] text-gray-500 mt-1">Ask your wifey for her link code and add it in your edit profile to connect.</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </section>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'tracker' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Phase Visualization */}
            <div className="relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-display">Cycle Tracker</h2>
                <div className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${currentConfig.accentColor} ${currentConfig.textColor}`}>
                  {currentConfig.label} Mode
                </div>
              </div>

              <AIInsightCard 
                phase={currentPhase}
                symptoms={symptoms[format(new Date(), 'yyyy-MM-dd')]?.discomfort || []}
                mood={symptoms[format(new Date(), 'yyyy-MM-dd')]?.mood || 'none'}
                energy={symptoms[format(new Date(), 'yyyy-MM-dd')]?.energy || 'none'}
                mode={mode}
              />
              
              <div className="grid grid-cols-4 gap-2 mb-8 p-1 bg-gray-100 rounded-2xl">
                {phases.map((p) => (
                  <div
                    key={p.id}
                    className={`relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all ${
                      currentPhase === p.id 
                        ? 'bg-white shadow-sm text-gray-900' 
                        : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mb-1 ${currentPhase === p.id ? p.color : 'bg-transparent'}`} />
                    {p.icon}
                    <span className="text-[10px] font-bold uppercase tracking-tight">{p.label}</span>
                  </div>
                ))}
              </div>

              {/* Interactive Circle (Visual only) */}
              <div className="flex justify-center mb-12">
                <div className="relative w-64 h-64 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="50%" cy="50%" r="48%"
                      className="stroke-gray-100 fill-none"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50%" cy="50%" r="48%"
                      className={`fill-none ${phases.find(p => p.id === currentPhase)?.color.replace('bg-', 'stroke-')}`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "0 1000" }}
                      animate={{ strokeDasharray: "350 1000" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Status</span>
                    <span className="text-3xl font-black font-display leading-tight">
                      {currentPhase === 'menstruation' ? 'Phase 01' : currentPhase === 'follicular' ? 'Phase 02' : currentPhase === 'ovulation' ? 'Phase 03' : 'Phase 04'}
                    </span>
                    <div className="mt-2 text-xs font-medium text-gray-500 flex flex-col items-center gap-1 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100">
                       <span className="text-gray-400 uppercase text-[10px] tracking-tighter">Next Period</span>
                       <span className="font-bold">{format(predictedNextPeriod, 'MMM dd')}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Insight Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${currentPhase}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className={`p-8 rounded-[40px] shadow-2xl shadow-rose-200/20 border border-white relative overflow-hidden ${
                  mode === 'hubby' ? 'bg-blue-50/30' : mode === 'wifey' ? 'bg-rose-50/30' : 'bg-indigo-50/30'
                }`}
              >
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/50 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-2xl ${currentConfig.color} text-white shadow-lg`}>
                      {currentPhase === 'menstruation' && <Moon className="w-6 h-6" />}
                      {currentPhase === 'follicular' && <Leaf className="w-6 h-6" />}
                      {currentPhase === 'ovulation' && <Flame className="w-6 h-6" />}
                      {currentPhase === 'luteal' && <Sun className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
                        {mode === 'hubby' && partnerProfile ? `${partnerProfile.username}'s Phase` : `${currentPhase} Phase`}
                      </h3>
                      <p className="text-xl font-bold font-serif italic text-gray-900">
                        {mode === 'hubby' && partnerProfile 
                          ? `${partnerProfile.username} is in her ${currentPhase} phase! Be gentle with your wife.`
                          : getPhaseTitle()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-lg leading-relaxed text-gray-700 font-medium font-sans">
                      {getPhaseContent()}
                    </p>

                    <div className="grid grid-cols-1 gap-3 pt-4">
                      {mode === 'wifey' && activeInsight.wifeyReminder && (
                        <div className="flex items-start gap-4 p-5 bg-rose-500 text-white rounded-[28px] shadow-lg shadow-rose-200">
                          <div className="p-2 bg-white/20 rounded-xl">
                            <Heart className="w-5 h-5 fill-current" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Inner Peace Note</p>
                            <p className="text-sm font-medium leading-relaxed">
                              {activeInsight.wifeyReminder}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm transition-colors">
                        <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 mb-0.5">Mindfulness Tip</p>
                          <p className="text-xs text-gray-500 leading-snug">
                            {mode === 'hubby' 
                              ? "Focus on active listening and non-judgmental support today." 
                              : "Practice the 5-5-5 breathing rule if you feel reactives."}
                          </p>
                        </div>
                      </div>
                      
                      {mode === 'hubby' && (
                        <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm transition-colors">
                          <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 mb-0.5">Patience Check</p>
                            <p className="text-xs text-gray-500 leading-snug">Her body is doing a lot of work. Your consistency is her comfort.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'calendar' ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-2xl font-bold font-display">Cycle Log</h2>
            </div>
            
            <PhaseForecast getPhaseForDate={getPhaseForDate} />
            
            <Calendar 
              records={records} 
              symptoms={symptoms}
              predictedStart={predictedNextPeriod} 
              predictedOvulation={predictedOvulation}
              predictedDuration={weightedPeriodLength}
              getPhaseForDate={getPhaseForDate}
              onDateClick={handleDateClick} 
              onLogSymptom={(date) => setSelectedSymptomDate(date)}
            />

            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-colors">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Stats</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-colors">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cycle Avg</p>
                   <p className="text-xl font-bold font-display text-gray-900">{averageCycleLength} Days</p>
                 </div>
                 <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-colors">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Prediction</p>
                   <p className="text-sm font-bold font-display text-rose-500">{weightedPeriodLength} Day Period</p>
                 </div>
               </div>
            </div>

            {/* Partner Note Section */}
            {mode === 'hubby' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-blue-50/50 border border-blue-100/50 rounded-[32px] space-y-4 transition-colors"
              >
                <div className="flex items-center gap-2 text-blue-600">
                  <Coffee className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Message to Her</h4>
                </div>
                <textarea
                  value={partnerNote}
                  onChange={(e) => setPartnerNote(e.target.value)}
                  placeholder="Leave a sweet note or reminder for her..."
                  className="w-full p-4 bg-white/80 rounded-2xl text-sm border-none outline-none resize-none h-24 placeholder:text-gray-300 focus:ring-2 focus:ring-blue-100 text-gray-900 transition-colors"
                />
                <p className="text-[10px] font-medium text-blue-400">This will appear on her home screen.</p>
              </motion.div>
            )}

            {mode === 'wifey' && partnerNote && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-200 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                  <Heart className="w-16 h-16 fill-current" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3 opacity-80">
                    <Coffee className="w-4 h-4" />
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Message from Him</h4>
                  </div>
                  <p className="text-base font-serif italic leading-relaxed">"{partnerNote}"</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : activeTab === 'wellness' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="text-center">
               <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner transition-colors">
                  <Heart className="w-10 h-10 fill-current" />
               </div>
               <h2 className="text-2xl font-bold font-display text-gray-900">Wellness Corner</h2>
               <p className="text-gray-500 text-sm mt-2">Nurturing your body and mind, one phase at a time.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Active Reminders Banner */}
              <AnimatePresence>
                {reminders.logSymptoms.enabled && !symptoms[format(new Date(), 'yyyy-MM-dd')] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-[28px] flex items-center gap-4 mb-4 transition-colors">
                      <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-amber-900 leading-tight">Daily Log Pending</p>
                        <p className="text-[10px] font-medium tracking-wide text-amber-700">Remember to log how {mode === 'hubby' ? "she's" : "you're"} feeling around {formatTime12h(reminders.logSymptoms.time)}.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedSymptomDate(new Date())}
                        className="px-4 py-2 bg-white text-amber-600 text-[10px] font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                      >
                        LOG NOW
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm transition-colors">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Phase Specific Wellness
                </h3>
                <div className="space-y-3">
                  {currentPhase === 'menstruation' && (
                    <>
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 transition-colors">
                        <p className="text-sm font-bold text-rose-700">Warmth & Rest</p>
                        <p className="text-xs text-rose-600 mt-1">Use a hot water bottle and prioritize 8-9 hours of sleep.</p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 transition-colors">
                        <p className="text-sm font-bold text-rose-700">Iron Rich Foods</p>
                        <p className="text-xs text-rose-600 mt-1">Leafy greens or red meat to replenish iron levels.</p>
                      </div>
                    </>
                  )}
                  {currentPhase === 'follicular' && (
                    <>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 transition-colors">
                        <p className="text-sm font-bold text-emerald-700">Social Re-entry</p>
                        <p className="text-xs text-emerald-600 mt-1">Great time to catch up with friends or start new hobbies.</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 transition-colors">
                        <p className="text-sm font-bold text-emerald-700">Vitamin C</p>
                        <p className="text-xs text-emerald-600 mt-1">Boost energy levels with fresh citrus fruits.</p>
                      </div>
                    </>
                  )}
                  {currentPhase === 'ovulation' && (
                    <>
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 transition-colors">
                        <p className="text-sm font-bold text-orange-700">High Intensity</p>
                        <p className="text-xs text-orange-600 mt-1">You're at your strongest. Perfect for challenging workouts.</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 transition-colors">
                        <p className="text-sm font-bold text-orange-700">Hydration</p>
                        <p className="text-xs text-orange-600 mt-1">Stay well hydrated as your metabolic rate increases.</p>
                      </div>
                    </>
                  )}
                  {currentPhase === 'luteal' && (
                    <>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 transition-colors">
                        <p className="text-sm font-bold text-blue-700">Magnesium Support</p>
                        <p className="text-xs text-blue-600 mt-1">Dark chocolate or spinich can help with PMS symptoms.</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 transition-colors">
                        <p className="text-sm font-bold text-blue-700">Slow Yoga</p>
                        <p className="text-xs text-blue-600 mt-1">Gentle stretching to alleviate bloating and tension.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[32px] text-white shadow-xl shadow-rose-200 transition-shadow">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 fill-current" />
                  Daily Ritual
                </h3>
                <p className="text-sm opacity-90 leading-relaxed mb-4">
                  Take 5 minutes today to write down three things you love about yourself. Your inner critic is just a passenger, you are the driver.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-display text-gray-900">History</h2>
              <div className="flex p-1 bg-gray-100 rounded-2xl">
                <button
                  onClick={() => setHistorySubTab('cycles')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${historySubTab === 'cycles' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                >
                  Cycles
                </button>
                <button
                  onClick={() => setHistorySubTab('symptoms')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${historySubTab === 'symptoms' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                >
                  Symptoms
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {historySubTab === 'cycles' ? (
                <>
                  <CycleDataViz history={history} />
                  {history.length > 0 ? (
                    history.map((item, idx) => (
                    <motion.div
                      key={item.start.toISOString()}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm block group transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl transition-colors">
                            <CalendarDays className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {format(item.start, 'MMM dd, yyyy')}
                              {item.end ? ` — ${format(item.end, 'MMM dd')}` : ' (Started)'}
                            </p>
                            <p className="text-xs text-gray-400 font-medium">Recorded Cycle</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setConfirmDeleteRecord(item)}
                          className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="px-4 py-3 bg-gray-50 rounded-2xl transition-colors">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.1em] mb-1">Duration</p>
                          <p className="text-sm font-bold text-gray-700">{item.duration ? `${item.duration} Days` : 'Ongoing'}</p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 rounded-2xl transition-colors">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.1em] mb-1">Cycle Length</p>
                          <p className="text-sm font-bold text-gray-700">{item.cycleLength ? `${item.cycleLength} Days` : '—'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 rounded-[40px] border border-dashed border-gray-200 bg-gray-50 transition-colors">
                    <HistoryIcon className="w-12 h-12 mx-auto mb-4 text-gray-200 transition-colors" />
                    <p className="font-medium text-gray-400 transition-colors">No cycles recorded yet.</p>
                  </div>
                )}
                </>
              ) : (
                /* Symptom History */
                Object.keys(symptoms).length > 0 ? (
                  Object.entries(symptoms)
                    .sort((a, b) => b[0].localeCompare(a[0])) // Latest first
                    .map(([dateKey, logEntry], idx) => {
                      const log = logEntry as SymptomLog;
                      return (
                        <motion.div
                          key={dateKey}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm block group transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                                <Heart className="w-5 h-5 fill-current" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {format(new Date(dateKey), 'EEEE, MMM do, yyyy')}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getPhaseForDate(new Date(dateKey))} phase</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedSymptomDate(new Date(dateKey))}
                              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {log.mood !== 'none' && (
                                <div className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full flex items-center gap-2 transition-colors">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span className="text-[10px] font-bold capitalize text-gray-600">{log.mood}</span>
                                </div>
                              )}
                              {log.energy !== 'none' && (
                                <div className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full flex items-center gap-2 transition-colors">
                                  <Flame className="w-3 h-3 text-orange-400" />
                                  <span className="text-[10px] font-bold capitalize text-gray-600">{log.energy} Energy</span>
                                </div>
                              )}
                              {log.discomfort.map(d => (
                                <div key={d} className="px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full flex items-center gap-2 transition-colors">
                                  <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                                  <span className="text-[10px] font-bold capitalize text-rose-600">{d}</span>
                                </div>
                              ))}
                            </div>
                            {log.note && (
                              <p className="text-sm leading-relaxed text-gray-500 p-4 bg-gray-50 rounded-2xl italic transition-colors">
                                "{log.note}"
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                ) : (
                  <div className="text-center py-20 rounded-[40px] border border-dashed border-gray-200 bg-gray-50 transition-colors">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-gray-200 transition-colors" />
                    <p className="font-medium text-gray-400 transition-colors">No symptoms logged yet.</p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}

        <footer className="mt-12 text-center text-gray-400 pb-32">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1">Tsuki Calendar</p>
          <p className="text-[10px]">Your personal cycle companion.</p>
          <p className="text-[10px] mt-2 opacity-50">Tip: Hold a date in the calendar to log symptoms.</p>
        </footer>
      </main>

      <AnimatePresence>
        {selectedSymptomDate && (
          <SymptomLogger
            date={selectedSymptomDate}
            currentLog={symptoms[format(startOfDay(selectedSymptomDate), 'yyyy-MM-dd')]}
            onLog={(log) => logSymptom(selectedSymptomDate, log)}
            onClear={() => {
              deleteSymptom(selectedSymptomDate);
              setSelectedSymptomDate(null);
            }}
            onClose={() => setSelectedSymptomDate(null)}
          />
        )}

        {confirmDeleteRecord && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px]">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setConfirmDeleteRecord(null)}
               className="absolute inset-0"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative w-full max-w-[280px] bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 transition-colors"
             >
               <h3 className="text-base font-bold text-gray-900 text-center mb-6">Delete cycle record?</h3>
               <div className="flex gap-2">
                 <button
                   onClick={() => setConfirmDeleteRecord(null)}
                   className="flex-1 bg-gray-50 text-gray-400 text-xs font-bold py-3 rounded-xl hover:bg-gray-100 transition-all"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={() => {
                     deleteRecord(confirmDeleteRecord.start);
                     setConfirmDeleteRecord(null);
                   }}
                   className="flex-1 bg-rose-500 text-white text-xs font-bold py-3 rounded-xl shadow-sm active:scale-95 transition-all"
                 >
                   Yes
                 </button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Navigation Bar */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 bg-white/80 border-white/50 rounded-full glass shadow-xl border shadow-gray-200/50 transition-all duration-500">
        <button 
          id="nav-calendar" 
          onClick={() => setActiveTab('calendar')}
          className={`p-4 rounded-full transition-all ${
            activeTab === 'calendar' 
              ? 'bg-gray-900 text-white shadow-lg' 
              : 'text-gray-400 hover:text-gray-900'
          }`}
        >
          <Home className="w-6 h-6" />
        </button>
        <div className="w-[1px] h-8 mx-1 bg-gray-200 transition-colors" />
        <button 
          id="nav-tracker" 
          onClick={() => setActiveTab('tracker')}
          className={`p-4 rounded-full transition-all ${
            activeTab === 'tracker' 
              ? 'bg-gray-900 text-white shadow-lg' 
              : 'text-gray-400 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-6 h-6" />
        </button>
        <button 
          id="nav-history" 
          onClick={() => setActiveTab('history')}
          className={`p-4 rounded-full transition-all ${
            activeTab === 'history' 
              ? 'bg-gray-900 text-white shadow-lg' 
              : 'text-gray-400 hover:text-gray-900'
          }`}
        >
          <HistoryIcon className="w-6 h-6" />
        </button>
        <button 
          id="nav-wellness" 
          onClick={() => setActiveTab('wellness')}
          className={`p-4 rounded-full transition-all ${
            activeTab === 'wellness' 
              ? 'bg-gray-900 text-white shadow-lg' 
              : 'text-gray-400 hover:text-gray-900'
          }`}
        >
          <Heart className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}

