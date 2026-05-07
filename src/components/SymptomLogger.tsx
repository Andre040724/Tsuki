import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smile, 
  Frown, 
  Meh, 
  Zap, 
  Battery, 
  BatteryLow, 
  AlertCircle, 
  X,
  Stethoscope,
  Wind,
  Coffee,
  CloudLightning,
  Flame,
  Brain,
  Trash2
} from 'lucide-react';
import { SymptomLog } from '../types';
import { format } from 'date-fns';

interface SymptomLoggerProps {
  date: Date;
  onClose: () => void;
  onLog: (log: Partial<SymptomLog>) => void;
  onClear: () => void;
  currentLog?: SymptomLog;
}

const MOODS = [
  { id: 'happy', icon: Smile, label: 'Happy', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'calm', icon: Meh, label: 'Calm', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'anxious', icon: Brain, label: 'Anxious', color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'irritable', icon: CloudLightning, label: 'Irritable', color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'sad', icon: Frown, label: 'Sad', color: 'text-indigo-500', bg: 'bg-indigo-50' },
] as const;

const NOTE_PRESETS = [
  "Feeling extra hungry",
  "Cravings for sweets 🍫",
  "Needed more naps today",
  "Productive energy boost",
  "Woke up with a headache",
  "Mood is better now"
];

const ENERGY = [
  { id: 'high', icon: Zap, label: 'High', color: 'text-amber-500' },
  { id: 'medium', icon: Battery, label: 'Medium', color: 'text-emerald-500' },
  { id: 'low', icon: BatteryLow, label: 'Low', color: 'text-rose-400' },
] as const;

const DISCOMFORTS = [
  { id: 'cramps', icon: Flame, label: 'Cramps', color: 'text-rose-500' },
  { id: 'bloating', icon: Wind, label: 'Bloating', color: 'text-amber-600' },
  { id: 'headache', icon: Brain, label: 'Headache', color: 'text-blue-600' },
  { id: 'fatigue', icon: Coffee, label: 'Fatigue', color: 'text-brown-500' },
  { id: 'acne', icon: AlertCircle, label: 'Acne', color: 'text-rose-400' },
] as const;

export const SymptomLogger: React.FC<SymptomLoggerProps> = ({ 
  date, 
  onClose, 
  onLog, 
  onClear,
  currentLog 
}) => {
  const hasLogs = currentLog && (currentLog.mood !== 'none' || currentLog.energy !== 'none' || currentLog.discomfort.length > 0 || currentLog.note);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 transition-colors">
          <div>
            <h3 className="text-2xl font-bold font-display text-gray-900 tracking-tight">Today's Vibe</h3>
            <p className="text-sm text-gray-400 font-medium uppercase tracking-widest">{format(date, 'EEEE, MMM do')}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto overscroll-contain text-left">
          {/* Mood Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mood</h4>
              {currentLog?.mood !== 'none' && (
                 <button onClick={() => onLog({ mood: 'none' })} className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Clear</button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map(({ id, icon: Icon, label, color, bg }) => {
                const isActive = currentLog?.mood === id;
                return (
                  <button
                    key={id}
                    onClick={() => onLog({ mood: id })}
                    className="flex flex-col items-center gap-2 group transition-all"
                  >
                    <div className={`
                      w-full aspect-square rounded-[24px] flex items-center justify-center transition-all
                      ${isActive ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 scale-110' : `${bg} ${color} hover:scale-105 active:scale-95`}
                    `}>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Energy Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Energy</h4>
              {currentLog?.energy !== 'none' && (
                 <button onClick={() => onLog({ energy: 'none' })} className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Clear</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {ENERGY.map(({ id, icon: Icon, label, color }) => {
                const isActive = currentLog?.energy === id;
                return (
                  <button
                    key={id}
                    onClick={() => onLog({ energy: id })}
                    className={`
                      flex flex-col items-center gap-3 p-4 rounded-[28px] border-2 transition-all
                      ${isActive 
                        ? 'bg-gray-900 border-gray-900 text-white shadow-lg' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : color}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Discomfort Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-left">Physical Symptoms</h4>
              {(currentLog?.discomfort.length ?? 0) > 0 && (
                 <button onClick={() => onLog({ discomfort: [] })} className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Clear All</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {DISCOMFORTS.map(({ id, icon: Icon, label, color }) => {
                const isSelected = currentLog?.discomfort.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      const current = currentLog?.discomfort || [];
                      const next = isSelected 
                        ? current.filter(x => x !== id)
                        : [...current, id];
                      onLog({ discomfort: next });
                    }}
                    className={`
                      flex items-center gap-2 px-5 py-3 rounded-[20px] border-2 text-xs transition-all
                      ${isSelected 
                        ? 'bg-rose-500 border-rose-500 text-white font-bold shadow-md' 
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : color}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Note Section */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Daily Notes</h4>
            <div className="relative group/note">
              <textarea
                value={currentLog?.note || ''}
                onChange={(e) => onLog({ note: e.target.value })}
                placeholder="How was today specifically?"
                className="w-full p-6 bg-gray-50 rounded-[32px] border-2 border-transparent focus:bg-white focus:border-rose-100 focus:ring-0 text-sm transition-all resize-none h-40 font-medium text-gray-900 placeholder:text-gray-300"
              />
              <div className="absolute right-4 bottom-4 opacity-30 group-focus-within/note:opacity-10 transition-opacity">
                <Brain className="w-8 h-8 text-rose-500" />
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {NOTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    const current = currentLog?.note || '';
                    const next = current ? `${current}\n${preset}` : preset;
                    onLog({ note: next });
                  }}
                  className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-all border border-gray-100"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-8 bg-white border-t border-gray-100 flex gap-3 transition-colors">
          {hasLogs && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all logs for this date?')) {
                  onClear();
                }
              }}
              className="flex-1 bg-rose-50 text-rose-500 font-bold py-5 rounded-[24px] hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-sm">Delete Log</span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`
              font-bold py-5 rounded-[24px] shadow-lg active:scale-95 transition-all flex-[2] text-sm
              ${hasLogs ? 'bg-gray-900 text-white shadow-gray-200' : 'bg-gray-100 text-gray-400'}
            `}
          >
            {hasLogs ? 'Save Changes' : 'Close'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
