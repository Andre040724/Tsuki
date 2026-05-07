/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { CycleRecord } from '../hooks/useCycleData';

interface CycleDataVizProps {
  history: (CycleRecord & { duration?: number; cycleLength?: number })[];
}

export const CycleDataViz: React.FC<CycleDataVizProps> = ({ history }) => {
  // Recharts prefers data chronologically for trends
  const chartData = [...history]
    .filter(item => item.duration || item.cycleLength)
    .reverse() // Chronological order
    .slice(-6) // Show last 6 cycles
    .map(item => ({
      name: format(item.start, 'MMM dd'),
      duration: item.duration || 0,
      cycleLength: item.cycleLength || 0,
    }));

  if (chartData.length < 2) {
    return (
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm text-center mb-6">
        <p className="text-sm text-gray-500 font-medium italic">Track at least 2 cycles to see data trends.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <p className="text-xs font-bold text-gray-900">Period: {payload[0].value} Days</p>
            </div>
            {payload[1] && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-200" />
                <p className="text-xs font-bold text-gray-900">Cycle: {payload[1].value} Days</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Cycle Trends</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last {chartData.length} records</p>
      </div>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar 
              dataKey="duration" 
              name="Period" 
              fill="#f43f5e" 
              radius={[4, 4, 0, 0]} 
              barSize={12} 
            />
            <Bar 
              dataKey="cycleLength" 
              name="Cycle" 
              fill="#fecdd3" 
              radius={[4, 4, 0, 0]} 
              barSize={12} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period Duration</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-200" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cycle Length</span>
        </div>
      </div>
    </div>
  );
};
