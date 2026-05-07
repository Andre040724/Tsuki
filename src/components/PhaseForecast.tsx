/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { format, addDays, isToday, isSameDay } from 'date-fns';
import { CyclePhase } from '../types';

interface PhaseForecastProps {
  getPhaseForDate: (date: Date) => CyclePhase | 'none';
}

export const PhaseForecast: React.FC<PhaseForecastProps> = ({ getPhaseForDate }) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const getPhaseColor = (phase: CyclePhase | 'none') => {
    switch (phase) {
      case 'menstruation': return 'bg-rose-500';
      case 'follicular': return 'bg-emerald-500';
      case 'ovulation': return 'bg-orange-500';
      case 'luteal': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const getPhaseBg = (phase: CyclePhase | 'none') => {
    switch (phase) {
      case 'menstruation': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'follicular': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'ovulation': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'luteal': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-gray-900 px-1">Phase Forecast</h3>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next 7 Days</span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar -mx-1">
        {days.map((day, idx) => {
          const phase = getPhaseForDate(day);
          const active = isToday(day);

          return (
            <div 
              key={day.toISOString()}
              className={`flex-shrink-0 w-28 p-4 rounded-[28px] border transition-all ${
                active 
                  ? 'bg-gray-900 border-gray-900 text-white shadow-lg scale-105 z-10' 
                  : 'bg-white border-gray-100'
              }`}
            >
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${active ? 'text-gray-400' : 'text-gray-400'}`}>
                {idx === 0 ? 'Today' : format(day, 'EEE')}
              </p>
              <p className="text-xl font-bold mb-3 tracking-tighter">{format(day, 'dd')}</p>
              
              <div className="h-1 w-full bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div 
                  className={`h-full ${getPhaseColor(phase)}`} 
                  style={{ width: '100%' }}
                />
              </div>

              <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                {phase}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
