/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCcw, Brain, Leaf, Zap, Moon } from 'lucide-react';
import { getWellnessInsight, WellnessInsight } from '../services/aiWellnessService';

interface AIInsightCardProps {
  phase: string;
  symptoms: string[];
  mood: string;
  energy: string;
  mode: 'hubby' | 'wifey' | 'solo';
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ phase, symptoms, mood, energy, mode }) => {
  const [insight, setInsight] = useState<WellnessInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async () => {
    setLoading(true);
    const data = await getWellnessInsight(phase, symptoms, mood, energy, mode);
    setInsight(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, [phase]); // Re-fetch only when phase changes to keep it fresh but not too frequent

  const getTagIcon = (tag: string) => {
    switch (tag.toUpperCase()) {
      case 'NUTRITION': return <Leaf className="w-3 h-3 text-emerald-500" />;
      case 'MOVEMENT': return <Zap className="w-3 h-3 text-orange-500" />;
      case 'REST': return <Moon className="w-3 h-3 text-blue-500" />;
      default: return <Brain className="w-3 h-3 text-purple-500" />;
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag.toUpperCase()) {
      case 'NUTRITION': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'MOVEMENT': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'REST': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-purple-50 text-purple-700 border-purple-100';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-rose-50/50 p-6 rounded-[40px] border border-white shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 blur-3xl rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-200/20 blur-3xl rounded-full -ml-16 -mb-16" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Personal Prescription</h3>
          </div>
          <button 
            onClick={() => !loading && fetchInsight()}
            className={`p-2 rounded-xl hover:bg-white transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
          >
            <RefreshCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 space-y-4"
            >
              <div className="h-6 w-3/4 bg-gray-200/50 animate-pulse rounded-lg" />
              <div className="h-4 w-full bg-gray-200/50 animate-pulse rounded-lg" />
              <div className="h-4 w-2/3 bg-gray-200/50 animate-pulse rounded-lg" />
            </motion.div>
          ) : insight ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getTagColor(insight.tag)}`}>
                {getTagIcon(insight.tag)}
                {insight.tag}
              </div>
              
              <div>
                <h4 className="text-xl font-bold text-gray-900 tracking-tight mb-2">{insight.headline}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{insight.advice}</p>
              </div>

              <div className="p-4 bg-white/80 rounded-2xl border border-white/50 shadow-xs flex items-start gap-3">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500 flex-shrink-0">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-bold text-indigo-900">
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Coach Tip</span>
                  {insight.actionItem}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};
