'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Activity, Gauge, Scissors, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { FlowEngineResponse } from '@/types/flow';

interface FlowStatsPanelProps {
  result: FlowEngineResponse;
  className?: string;
}

interface Stat {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'pink' | 'blue' | 'yellow' | 'orange';
}

const TONE_CLASSES: Record<Stat['tone'], string> = {
  pink: 'bg-brand-pink text-white',
  blue: 'bg-brand-blue text-black',
  yellow: 'bg-brand-yellow text-black',
  orange: 'bg-brand-orange text-white',
};

function describeSlope(slope: number): string {
  if (slope > 0.002) return 'Builds upward';
  if (slope < -0.002) return 'Winds down';
  return 'Holds steady';
}

/**
 * Surfaces the engine's real numbers. Retention matters most: Drift deliberately
 * drops tracks that break its vibe gate, and users should see that rather than
 * wonder where their songs went.
 */
export function FlowStatsPanel({ result, className }: FlowStatsPanelProps) {
  const retention = result.originalCount
    ? Math.round((result.acceptedCount / result.originalCount) * 100)
    : 100;

  const stats: Stat[] = [
    {
      label: 'Flow Score',
      value: `${result.smoothnessScore.toFixed(1)}`,
      hint: 'out of 100 — higher means gentler transitions',
      icon: <Gauge className="w-4 h-4" />,
      tone: 'pink',
    },
    {
      label: 'Tracks Kept',
      value: `${result.acceptedCount}/${result.originalCount}`,
      hint: `${retention}% retention${result.filteredCount > 0 ? ` · ${result.filteredCount} filtered` : ''}`,
      icon: <Scissors className="w-4 h-4" />,
      tone: 'blue',
    },
    {
      label: 'Jarring Jumps',
      value: `${result.metrics.jarringCount}`,
      hint: 'energy leaps above 0.35 between tracks',
      icon: <Zap className="w-4 h-4" />,
      tone: result.metrics.jarringCount === 0 ? 'yellow' : 'orange',
    },
    {
      label: 'Energy Arc',
      value: describeSlope(result.metrics.energySlope),
      hint: `avg ΔE ${result.metrics.meanDeltaEnergy.toFixed(3)} · avg ΔBPM ${result.metrics.meanBpmDelta.toFixed(1)}`,
      icon: <Activity className="w-4 h-4" />,
      tone: 'blue',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
          className="bg-white neo-border-sm border-black rounded-2xl p-3 flex flex-col gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center shrink-0',
                TONE_CLASSES[stat.tone]
              )}
            >
              {stat.icon}
            </span>
            <span className="font-mono text-[9px] font-black uppercase text-slate-500 leading-tight">
              {stat.label}
            </span>
          </div>
          <div className="font-black text-lg sm:text-xl leading-none tracking-tight">{stat.value}</div>
          <p className="font-mono text-[9px] font-bold text-slate-400 leading-snug">{stat.hint}</p>
        </motion.div>
      ))}
    </div>
  );
}
