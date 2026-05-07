/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWithinInterval,
  startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { CyclePhase, DailySymptomRecord } from '../types';

interface CalendarProps {
  records: { start: Date; end?: Date }[];
  symptoms?: DailySymptomRecord;
  predictedStart?: Date;
  predictedOvulation?: Date;
  predictedDuration?: number;
  getPhaseForDate: (date: Date) => CyclePhase | 'none';
  onDateClick: (date: Date) => void;
  onLogSymptom?: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  records, 
  symptoms = {},
  predictedStart, 
  predictedOvulation,
  predictedDuration = 5,
  getPhaseForDate,
  onDateClick,
  onLogSymptom
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [showPhases, setShowPhases] = React.useState(true);

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayStatus = (date: Date) => {
    const d = startOfDay(date);
    const record = records.find(r => {
      if (r.end) {
        return isWithinInterval(d, { start: startOfDay(r.start), end: startOfDay(r.end) });
      }
      return isSameDay(d, startOfDay(r.start));
    });

    if (record) {
      const isStart = isSameDay(d, startOfDay(record.start));
      const isEnd = record.end && isSameDay(d, startOfDay(record.end));
      
      const periodDay = Math.abs(Math.round((d.getTime() - startOfDay(record.start).getTime()) / (1000 * 60 * 60 * 24))) + 1;
      
      if (isStart && isEnd) return { status: 'selected', periodDay };
      if (isStart) return { status: 'selected-start', periodDay };
      if (isEnd) return { status: 'selected-end', periodDay };
      return { status: 'selected-mid', periodDay };
    }

    if (predictedStart) {
      const predRange = Array.from({ length: predictedDuration }, (_, i) => startOfDay(new Date(predictedStart.getTime() + i * 24 * 60 * 60 * 1000)));
      if (predRange.some(pred => isSameDay(pred, d))) {
          const isStart = isSameDay(predRange[0], d);
          const isEnd = isSameDay(predRange[predRange.length - 1], d);
          
          if (isStart && isEnd) return { status: 'predicted', periodDay: 1 };
          if (isStart) return { status: 'predicted-start', periodDay: 1 };
          if (isEnd) return { status: 'predicted-end', periodDay: predictedDuration };
          
          const periodDay = Math.abs(Math.round((d.getTime() - predRange[0].getTime()) / (1000 * 60 * 60 * 24))) + 1;
          return { status: 'predicted-mid', periodDay };
      }
    }

    return { status: 'none', periodDay: 0 };
  };

  const getPhaseStyles = (phase: CyclePhase | 'none') => {
    if (!showPhases) return '';
    switch (phase) {
      case 'menstruation': return 'bg-rose-50';
      case 'follicular': return 'bg-emerald-50';
      case 'ovulation': return 'bg-orange-50';
      case 'luteal': return 'bg-blue-50';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-rose-200/10 border border-gray-100 transition-colors">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h3 className="text-lg font-bold font-display text-gray-900 leading-none mb-1">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={() => setShowPhases(!showPhases)}
            className="text-[10px] font-bold text-rose-50 uppercase tracking-widest hover:underline"
          >
            {showPhases ? 'Hide Phases' : 'Show Predictions'}
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const { status, periodDay } = getDayStatus(day);
          const phase = getPhaseForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const hasSymptoms = symptoms[format(startOfDay(day), 'yyyy-MM-dd')];
          
          const prevDay = i > 0 ? days[i-1] : null;
          const nextDay = i < days.length - 1 ? days[i+1] : null;
          
          const prevStatus = prevDay ? getDayStatus(prevDay).status : 'none';
          const nextStatus = nextDay ? getDayStatus(nextDay).status : 'none';

          const isPhaseStart = !prevDay || getPhaseForDate(prevDay) !== phase || i % 7 === 0 || (prevStatus !== 'none' && status === 'none');
          const isPhaseEnd = !nextDay || getPhaseForDate(nextDay) !== phase || i % 7 === 6 || (nextStatus !== 'none' && status === 'none');
          
          const isRowStart = i % 7 === 0;
          const isRowEnd = i % 7 === 6;
          
          const statusClasses = (() => {
            if (status === 'predicted' || status.startsWith('predicted-')) {
              let classes = 'bg-rose-50 text-rose-400 ring-1 ring-inset ring-rose-100 font-bold z-10 ';
              if (status === 'predicted') classes += 'rounded-xl';
              else if (status === 'predicted-start') classes += isRowEnd ? 'rounded-xl' : 'rounded-l-xl rounded-r-none';
              else if (status === 'predicted-end') classes += isRowStart ? 'rounded-xl' : 'rounded-r-xl rounded-l-none';
              else classes += isRowStart ? 'rounded-l-xl' : isRowEnd ? 'rounded-r-xl' : 'rounded-none';
              return classes;
            }

            if (status === 'selected') {
              return 'bg-gradient-to-br from-rose-600 to-rose-500 !text-white shadow-md shadow-rose-200 z-[11] rounded-xl ring-2 ring-white';
            }
            if (status === 'selected-start') {
              return `bg-gradient-to-r from-rose-600 to-rose-500 !text-white shadow-md shadow-rose-200 z-[11] ${isRowEnd ? 'rounded-xl ring-2 ring-white' : 'rounded-l-xl rounded-r-none'}`;
            }
            if (status === 'selected-end') {
              return `bg-rose-500 !text-white shadow-md shadow-rose-200 z-[11] ${isRowStart ? 'rounded-xl ring-2 ring-white' : 'rounded-r-xl rounded-l-none'}`;
            }
            if (status === 'selected-mid') {
              let bg = '';
              if (periodDay === 2) bg = 'bg-gradient-to-r from-rose-500 to-rose-400 !text-white opacity-95';
              else if (periodDay === 3) bg = 'bg-gradient-to-r from-rose-400 to-rose-200 !text-rose-900';
              else bg = 'bg-rose-100 !text-rose-800';
              
              const radius = isRowStart && isRowEnd ? 'rounded-xl' : isRowStart ? 'rounded-l-xl rounded-r-none' : isRowEnd ? 'rounded-r-xl rounded-l-none' : 'rounded-none';
              
              return `${bg} z-[10] ${radius}`;
            }
            return '';
          })();

          return (
            <button
              key={i}
              onClick={() => onDateClick(day)}
              onContextMenu={(e) => {
                e.preventDefault();
                onLogSymptom?.(day);
              }}
              className={`
                relative h-11 flex items-center justify-center text-sm font-medium transition-all
                ${!isCurrentMonth ? 'text-gray-200' : 'text-gray-600'}
                ${status === 'none' ? getPhaseStyles(phase) : ''}
                ${status === 'none' && isPhaseStart ? 'rounded-l-xl' : ''}
                ${status === 'none' && isPhaseEnd ? 'rounded-r-xl' : ''}
                ${statusClasses}
                ${isToday && status === 'none' ? 'ring-2 ring-gray-900 ring-inset rounded-xl z-20' : ''}
                hover:scale-110 hover:z-30 hover:rounded-xl active:scale-95
              `}
            >
              <span className="relative z-10">{format(day, 'd')}</span>
              {hasSymptoms && (
                <div className="absolute top-2 right-2 w-1 h-1 bg-rose-400 rounded-full z-20 shadow-sm" />
              )}
              {isToday && status === 'none' && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-gray-900 rounded-full z-10" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-y-3 gap-x-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-50 border border-rose-100" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Menstruation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-100" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Follicular</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-50 border border-orange-100" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ovulation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-50 border border-blue-100" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Luteal</span>
        </div>
      </div>
    </div>
  );
};
