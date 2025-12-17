import React, { useState, useEffect } from 'react';
import Widget from './components/Widget';
import Settings from './components/Settings';
import { Period, CurrentStatus, AppPreferences, WeeklySchedule } from './types';
import { analyzeSchedule } from './utils/time';

const App: React.FC = () => {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  // Default opacity set to 0.7
  const [preferences, setPreferences] = useState<AppPreferences>({ timeFormat: '24h', schoolLevel: 'HIGH', opacity: 0.7 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [status, setStatus] = useState<CurrentStatus>({
    currentPeriod: null,
    nextPeriod: null,
    status: 'before_school',
    remainingSeconds: 0,
    totalDurationSeconds: 1,
    elapsedSeconds: 0,
    dayName: ''
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedSchedule = localStorage.getItem('schoolSchedule');
    const savedPreferences = localStorage.getItem('appPreferences');

    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        // Migration for new fields
        if (!parsed.schoolLevel) parsed.schoolLevel = 'HIGH';
        if (typeof parsed.opacity !== 'number') parsed.opacity = 0.7;
        setPreferences(parsed);
      } catch (e) {
        console.error("Failed to parse preferences", e);
      }
    } else {
        // Force 24h default for new users or if not set
        setPreferences(prev => ({ ...prev, timeFormat: '24h', opacity: 0.7 }));
    }

    if (savedSchedule) {
      try {
        const parsed = JSON.parse(savedSchedule);
        
        // Data Migration: Check if it's the old array format
        if (Array.isArray(parsed)) {
            console.log("Migrating legacy schedule to weekly format");
            const newWeekly: WeeklySchedule = {};
            // Apply old schedule to Mon-Fri (1-5)
            for (let i = 1; i <= 5; i++) {
                newWeekly[i] = JSON.parse(JSON.stringify(parsed));
            }
            setSchedule(newWeekly);
            localStorage.setItem('schoolSchedule', JSON.stringify(newWeekly));
        } else {
            setSchedule(parsed);
        }
      } catch (e) {
        console.error("Failed to parse schedule", e);
        setIsSettingsOpen(true);
      }
    } else {
      // First time user, open settings
      setIsSettingsOpen(true);
    }
  }, []);

  // Timer loop
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dayIndex = now.getDay(); // 0-6
      const todaysSchedule = schedule[dayIndex] || [];
      
      const newStatus = analyzeSchedule(todaysSchedule);
      setStatus(newStatus);
    };

    tick(); // Initial call
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [schedule]);

  const handleSaveSettings = (newSchedule: WeeklySchedule, newPreferences: AppPreferences) => {
    setSchedule(newSchedule);
    setPreferences(newPreferences);
    localStorage.setItem('schoolSchedule', JSON.stringify(newSchedule));
    localStorage.setItem('appPreferences', JSON.stringify(newPreferences));
    setIsSettingsOpen(false);
  };

  const handleUpdatePreferences = (key: keyof AppPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    localStorage.setItem('appPreferences', JSON.stringify(newPreferences));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
        {/* 
            In a real desktop widget scenario, the background would be transparent. 
            Here we center it to simulate the widget experience.
        */}
        
      {isSettingsOpen ? (
        <div className="animate-in fade-in zoom-in duration-300">
             <Settings 
                weeklySchedule={schedule}
                preferences={preferences}
                onSave={handleSaveSettings} 
                onClose={() => setIsSettingsOpen(false)} 
            />
        </div>
       
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Widget 
                status={status}
                preferences={preferences}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onUpdatePreferences={handleUpdatePreferences}
            />
        </div>
      )}
    </div>
  );
};

export default App;