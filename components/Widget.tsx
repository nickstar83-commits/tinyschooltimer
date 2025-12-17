import React, { useMemo, useState } from 'react';
import { PeriodType, CurrentStatus, AppPreferences } from '../types';
import { Settings, BookOpen, Coffee, Utensils, Clock, Calendar, Pin, Sun } from 'lucide-react';
import { formatTimeValue } from '../utils/time';

interface WidgetProps {
  status: CurrentStatus;
  preferences: AppPreferences;
  onOpenSettings: () => void;
  onUpdatePreferences: (key: keyof AppPreferences, value: any) => void;
}

const Widget: React.FC<WidgetProps> = ({ status, preferences, onOpenSettings, onUpdatePreferences }) => {
  
  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercentage = useMemo(() => {
    if (status.totalDurationSeconds === 0) return 0;
    const pct = (status.elapsedSeconds / status.totalDurationSeconds) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }, [status]);

  const getIcon = () => {
    const iconClass = "w-4 h-4"; // Compact icon
    if (status.status === 'no_schedule') return <Calendar className={`${iconClass} text-gray-400`} />;
    if (!status.currentPeriod) return <Clock className={`${iconClass} text-gray-400`} />;
    
    switch (status.currentPeriod.type) {
      case PeriodType.CLASS: return <BookOpen className={`${iconClass} text-blue-400`} />;
      case PeriodType.BREAK: return <Coffee className={`${iconClass} text-green-400`} />;
      case PeriodType.LUNCH: return <Utensils className={`${iconClass} text-orange-400`} />;
      default: return <Clock className={`${iconClass} text-purple-400`} />;
    }
  };

  const getMainText = () => {
    if (status.status === 'no_schedule') return '일정 없음';
    if (status.status === 'before_school') return '등교 전';
    if (status.status === 'after_school') return '일과 종료';
    if (status.status === 'gap') return '쉬는 시간';
    return status.currentPeriod?.name || 'Unknown';
  };

  const getSubText = () => {
    const { timeFormat } = preferences;

    if (status.status === 'no_schedule') {
        return '휴일/일정없음';
    }
    if (status.status === 'before_school' && status.nextPeriod) {
      return `첫 수업: ${formatTimeValue(status.nextPeriod.startTime, timeFormat)}`;
    }
    if (status.status === 'after_school') {
      return '수고했어요!';
    }
    if (status.status === 'gap' && status.nextPeriod) {
      return `다음: ${status.nextPeriod.name}`;
    }
    if (status.currentPeriod) {
       return `${formatTimeValue(status.currentPeriod.startTime, timeFormat)} - ${formatTimeValue(status.currentPeriod.endTime, timeFormat)}`;
    }
    return '';
  };

  const getThemeColor = () => {
    if (status.status === 'no_schedule') return 'bg-gray-600';
    if (!status.currentPeriod) return 'bg-gray-500';
    switch (status.currentPeriod.type) {
      case PeriodType.CLASS: return 'bg-blue-500';
      case PeriodType.BREAK: return 'bg-green-500';
      case PeriodType.LUNCH: return 'bg-orange-500';
      default: return 'bg-purple-500';
    }
  };

  const handlePopout = () => {
    // Open a small popup window which stays "on top" relative to tabs in some OS/browsers
    const width = 260;
    const height = 160;
    const left = window.screen.width - width - 50;
    const top = 50;
    
    window.open(
        window.location.href, 
        'SchoolTimerWidget', 
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );
  };

  return (
    // Compact width w-64 (256px) and reduced padding
    <div 
        className="group relative w-64 rounded-xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300"
        style={{ backgroundColor: `rgba(0, 0, 0, ${preferences.opacity})`, backdropFilter: 'blur(12px)' }}
    >
      {/* Background Progress Bar */}
      {status.status === 'active' && (
        <div 
          className={`absolute bottom-0 left-0 h-1 ${getThemeColor()} transition-all duration-1000 ease-linear opacity-80`}
          style={{ width: `${progressPercentage}%` }}
        />
      )}

      {/* Top Controls (Pin & Settings) - Visible on Hover */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
         <button 
            onClick={handlePopout}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-blue-300 transition-colors"
            title="새 창으로 띄우기 (항상 위 효과)"
        >
            <Pin size={12} />
        </button>
        <button 
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
            title="설정"
        >
            <Settings size={12} />
        </button>
      </div>

      <div className="p-3 relative z-10">
        <div className="flex justify-between items-start mb-1">
            <div className="flex items-center space-x-2 w-full">
                <div className={`p-1 rounded-md bg-white/5 border border-white/10 shadow-inner`}>
                {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    {/* Day Indicator */}
                    <div className="flex items-center space-x-1">
                         <span className="text-[10px] font-bold text-white/50 bg-white/10 px-1 py-px rounded uppercase tracking-wider leading-none">
                            {status.dayName}
                         </span>
                         {status.status === 'active' && (
                            <span className="text-[9px] text-red-400 font-bold animate-pulse leading-none">LIVE</span>
                         )}
                    </div>
                    {/* Compact Title */}
                    <h1 className="text-base font-bold text-white tracking-tight drop-shadow-sm leading-tight truncate mt-0.5">
                        {getMainText()}
                    </h1>
                </div>
            </div>
        </div>

        {/* Time & Remaining - Compact Layout */}
        <div className="flex items-end justify-between mt-1 pt-1 border-t border-white/5">
            <div className="text-xs font-medium text-white/60 font-mono">
                {getSubText()}
            </div>
            
             {status.status === 'active' || status.status === 'before_school' || status.status === 'gap' ? (
                <div className={`text-xl font-black tracking-tighter tabular-nums leading-none ${status.remainingSeconds < 60 ? 'text-red-400' : 'text-white'}`}>
                    {formatSeconds(status.remainingSeconds)}
                </div>
            ) : (
                <div className="text-xs text-white/40 font-medium">
                    --:--
                </div>
            )}
        </div>
      </div>
      
      {/* Opacity Slider - Bottom Overlay on Hover */}
      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2 z-20">
          <input 
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={preferences.opacity}
            onChange={(e) => onUpdatePreferences('opacity', parseFloat(e.target.value))}
            className="w-4/5 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-400 transition-colors"
            title="배경 투명도 조절"
          />
      </div>

    </div>
  );
};

export default Widget;