import React, { useState, useEffect, useRef } from 'react';
import { Period, PeriodType, AppPreferences, WeeklySchedule } from '../types';
import { addMinutes } from '../utils/time';
import { X, Plus, Trash2, Save, RotateCcw, Download, Clock, Copy, GraduationCap, Upload, FileJson, Check } from 'lucide-react';

interface SettingsProps {
  weeklySchedule: WeeklySchedule;
  preferences: AppPreferences;
  onSave: (schedule: WeeklySchedule, preferences: AppPreferences) => void;
  onClose: () => void;
}

// Default templates
const createDefaultSchedule = (minutesPerClass: number): Period[] => [
  { id: '1', name: '조회', startTime: '08:40', endTime: '09:00', type: PeriodType.OTHER },
  { id: '2', name: '1교시', startTime: '09:00', endTime: addMinutes('09:00', minutesPerClass), type: PeriodType.CLASS },
  { id: '3', name: '쉬는 시간', startTime: addMinutes('09:00', minutesPerClass), endTime: addMinutes('09:00', minutesPerClass + 10), type: PeriodType.BREAK },
  { id: '4', name: '2교시', startTime: addMinutes('09:00', minutesPerClass + 10), endTime: addMinutes('09:00', minutesPerClass * 2 + 10), type: PeriodType.CLASS },
];

const Settings: React.FC<SettingsProps> = ({ weeklySchedule, preferences, onSave, onClose }) => {
  const [localSchedule, setLocalSchedule] = useState<WeeklySchedule>(weeklySchedule);
  const [localPreferences, setLocalPreferences] = useState<AppPreferences>(preferences);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    // Default to today's index, or Monday (1) if it's weekend (0 or 6)
    const today = new Date().getDay();
    return (today === 0 || today === 6) ? 1 : today;
  });
  
  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);

  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map 0-6 to Day names
  const days = [
    { id: 1, label: '월' },
    { id: 2, label: '화' },
    { id: 3, label: '수' },
    { id: 4, label: '목' },
    { id: 5, label: '금' },
    { id: 6, label: '토' },
    { id: 0, label: '일' },
  ];

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const getCurrentDaySchedule = () => {
      return localSchedule[selectedDay] || [];
  };

  const updateCurrentDaySchedule = (newSchedule: Period[]) => {
      setLocalSchedule({
          ...localSchedule,
          [selectedDay]: newSchedule
      });
  };

  const handleAdd = () => {
    const currentSchedule = getCurrentDaySchedule();
    const newId = Math.random().toString(36).substr(2, 9);
    
    // Determine class duration based on school level
    const classDuration = localPreferences.schoolLevel === 'MIDDLE' ? 45 : 50;
    
    // Determine Start Time (Continuously from last period)
    let startTime = '09:00';
    if (currentSchedule.length > 0) {
        const lastPeriod = currentSchedule[currentSchedule.length - 1];
        startTime = lastPeriod.endTime;
    }

    // Determine Type and Name
    let type = PeriodType.CLASS;
    let name = '1교시';

    if (currentSchedule.length > 0) {
        const lastPeriod = currentSchedule[currentSchedule.length - 1];
        
        if (lastPeriod.type === PeriodType.CLASS) {
            // If last was class, add break
            type = PeriodType.BREAK;
            name = '쉬는 시간';
        } else {
            // If last was break (or other), add class
            type = PeriodType.CLASS;
            
            // Calculate next class number logic
            const classPeriods = currentSchedule.filter(p => p.type === PeriodType.CLASS);
            let maxNum = 0;
            
            classPeriods.forEach(p => {
                const match = p.name.match(/(\d+)교시/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                } else if (!isNaN(parseInt(p.name))) {
                    // Fallback if name is just "1"
                    const num = parseInt(p.name, 10);
                    if (num > maxNum) maxNum = num;
                }
            });
            
            name = `${maxNum + 1}교시`;
        }
    }

    // Determine Duration
    const duration = type === PeriodType.CLASS ? classDuration : 10;
    const endTime = addMinutes(startTime, duration);

    const newPeriod: Period = {
        id: newId,
        name,
        startTime,
        endTime,
        type
    };

    updateCurrentDaySchedule([...currentSchedule, newPeriod]);
  };

  const handleUpdate = (id: string, field: keyof Period, value: string) => {
    const currentSchedule = getCurrentDaySchedule();
    updateCurrentDaySchedule(currentSchedule.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // Special handler for time text inputs to enforce format
  const handleTimeInputBlur = (id: string, field: 'startTime' | 'endTime', value: string) => {
    // Remove non-digit and non-colon characters
    let clean = value.replace(/[^\d:]/g, '');
    
    // Auto-formatting logic
    // Case: User types "900" -> convert to "09:00"
    // Case: User types "9" -> convert to "09:00" (assuming hour)
    
    if (!clean.includes(':')) {
        if (clean.length === 3) {
            clean = `0${clean.substring(0,1)}:${clean.substring(1)}`;
        } else if (clean.length === 4) {
            clean = `${clean.substring(0,2)}:${clean.substring(2)}`;
        } else if (clean.length === 1 || clean.length === 2) {
            clean = `${clean.padStart(2, '0')}:00`;
        }
    }
    
    // Validate parts
    const parts = clean.split(':');
    if (parts.length >= 2) {
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        
        if (isNaN(h)) h = 0;
        if (isNaN(m)) m = 0;
        
        // Clamp values
        h = Math.min(23, Math.max(0, h));
        m = Math.min(59, Math.max(0, m));
        
        const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        handleUpdate(id, field, formatted);
    } else {
        // Fallback or do nothing if completely invalid
    }
  };

  const handleDelete = (id: string) => {
    const currentSchedule = getCurrentDaySchedule();
    updateCurrentDaySchedule(currentSchedule.filter(p => p.id !== id));
  };

  const handleReset = () => {
      if(confirm('현재 요일의 시간표를 초기화 하시겠습니까?')) {
          const duration = localPreferences.schoolLevel === 'MIDDLE' ? 45 : 50;
          updateCurrentDaySchedule(createDefaultSchedule(duration));
      }
  };

  // --- Copy Logic ---
  const openCopyModal = () => {
    // Default: select all weekdays except current day
    const defaultTargets = [1, 2, 3, 4, 5].filter(d => d !== selectedDay);
    setCopyTargetDays(defaultTargets);
    setIsCopyModalOpen(true);
  };

  const toggleCopyTarget = (dayId: number) => {
    if (copyTargetDays.includes(dayId)) {
      setCopyTargetDays(copyTargetDays.filter(d => d !== dayId));
    } else {
      setCopyTargetDays([...copyTargetDays, dayId]);
    }
  };

  const executeCopy = () => {
    const sourceSchedule = getCurrentDaySchedule();
    const newWeeklySchedule = { ...localSchedule };
    
    copyTargetDays.forEach(targetDay => {
        // Deep copy
        newWeeklySchedule[targetDay] = JSON.parse(JSON.stringify(sourceSchedule));
    });

    setLocalSchedule(newWeeklySchedule);
    setIsCopyModalOpen(false);
    alert('선택한 요일에 시간표가 복사되었습니다.');
  };

  // --- File I/O Logic ---
  const handleExport = () => {
      const data = {
          version: 1,
          schedule: localSchedule,
          preferences: localPreferences,
          exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `school-timer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const content = event.target?.result as string;
              const data = JSON.parse(content);
              
              if (data.schedule && data.preferences) {
                  setLocalSchedule(data.schedule);
                  setLocalPreferences(data.preferences);
                  alert('설정을 성공적으로 불러왔습니다.');
              } else {
                  alert('올바르지 않은 설정 파일 형식입니다.');
              }
          } catch (error) {
              console.error(error);
              alert('파일을 읽는 중 오류가 발생했습니다.');
          }
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleSaveInternal = () => {
    // Sort all schedules
    const sortedWeekly: WeeklySchedule = {};
    Object.keys(localSchedule).forEach(dayKey => {
        const day = parseInt(dayKey);
        const daySchedule = localSchedule[day] || [];
        sortedWeekly[day] = [...daySchedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    onSave(sortedWeekly, localPreferences);
    onClose();
  };
  
  const hasSchedule = (dayId: number) => {
      return localSchedule[dayId] && localSchedule[dayId].length > 0;
  };

  return (
    <div className="w-[600px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleFileChange} 
      />

      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
        <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-gray-800">학교시정표</h2>
            <div className="flex space-x-2">
                <button 
                  onClick={handleExport} 
                  className="px-2 py-1 text-xs font-bold text-gray-500 bg-gray-100 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center border border-gray-200"
                >
                    <Download size={11} className="mr-1" /> 내보내기
                </button>
                <button 
                  onClick={handleImportClick} 
                  className="px-2 py-1 text-xs font-bold text-gray-500 bg-gray-100 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center border border-gray-200"
                >
                    <Upload size={11} className="mr-1" /> 불러오기
                </button>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* PWA Install */}
        {installPrompt && (
             <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                    <FileJson size={18} className="text-white ml-2" />
                    <span className="font-bold text-sm">앱 설치 가능</span>
                </div>
                <button onClick={handleInstallClick} className="px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50">설치</button>
            </div>
        )}

        {/* Global Settings */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center space-x-2 text-gray-700 mb-2">
                    <GraduationCap size={16} />
                    <span className="font-bold text-xs">학교급 (수업 시간)</span>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                    <button
                        onClick={() => setLocalPreferences({...localPreferences, schoolLevel: 'MIDDLE'})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${localPreferences.schoolLevel === 'MIDDLE' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        중등 (45분)
                    </button>
                    <button
                        onClick={() => setLocalPreferences({...localPreferences, schoolLevel: 'HIGH'})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${localPreferences.schoolLevel === 'HIGH' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        고등 (50분)
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center space-x-2 text-gray-700 mb-2">
                    <Clock size={16} />
                    <span className="font-bold text-xs">시간 표시</span>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                    <button
                        onClick={() => setLocalPreferences({...localPreferences, timeFormat: '24h'})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${localPreferences.timeFormat === '24h' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        24시간
                    </button>
                    <button
                        onClick={() => setLocalPreferences({...localPreferences, timeFormat: '12h'})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${localPreferences.timeFormat === '12h' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        12시간
                    </button>
                </div>
            </div>
        </div>

        {/* Day Tabs */}
        <div>
            <div className="flex space-x-1 mb-2 overflow-x-auto pb-1">
                {days.map((day) => (
                    <button
                        key={day.id}
                        onClick={() => setSelectedDay(day.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap relative ${
                            selectedDay === day.id 
                            ? 'bg-gray-800 text-white shadow-md transform scale-105' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        {day.label}
                        {hasSchedule(day.id) && (
                            <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${selectedDay === day.id ? 'bg-blue-400' : 'bg-blue-500'}`} />
                        )}
                    </button>
                ))}
            </div>
            
            <div className="bg-gray-50 p-1 rounded-lg border border-gray-100 flex justify-between items-center px-3 py-2">
                 <span className="text-xs text-gray-400 font-medium">
                     {days.find(d => d.id === selectedDay)?.label}요일 시간표 편집 중
                 </span>
                 <button 
                    onClick={openCopyModal}
                    className="flex items-center px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-100"
                >
                    <Copy size={12} className="mr-1.5" /> 
                    다른 요일에 적용
                </button>
            </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-2">
            {(!getCurrentDaySchedule() || getCurrentDaySchedule().length === 0) && (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-sm">등록된 수업이 없습니다.</p>
                </div>
            )}

            {getCurrentDaySchedule().map((period) => (
            <div key={period.id} className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <select
                    value={period.type}
                    onChange={(e) => handleUpdate(period.id, 'type', e.target.value)}
                    className="w-[5.5rem] text-xs font-bold p-2 bg-gray-50 rounded-lg border-none focus:ring-1 focus:ring-blue-500 outline-none text-gray-700 cursor-pointer h-10"
                    >
                    <option value={PeriodType.CLASS}>수업</option>
                    <option value={PeriodType.BREAK}>쉬는시간</option>
                    <option value={PeriodType.LUNCH}>점심</option>
                    <option value={PeriodType.OTHER}>기타</option>
                    </select>
                    
                    <input
                    type="text"
                    placeholder="이름"
                    value={period.name}
                    onChange={(e) => handleUpdate(period.id, 'name', e.target.value)}
                    className="flex-1 min-w-[100px] text-sm font-medium p-2 bg-gray-50 text-gray-900 rounded-lg outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 transition-all placeholder:text-gray-300 h-10"
                    />
                </div>
                
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1.5 border border-gray-100 ml-auto sm:ml-0">
                    <input
                    type="text"
                    value={period.startTime}
                    onChange={(e) => handleUpdate(period.id, 'startTime', e.target.value)}
                    onBlur={(e) => handleTimeInputBlur(period.id, 'startTime', e.target.value)}
                    placeholder="HH:MM"
                    maxLength={5}
                    className="w-20 text-base p-1 bg-white rounded border border-gray-200 text-gray-900 outline-none font-mono text-center font-bold h-8 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    />
                    <span className="text-gray-400 text-sm font-bold">-</span>
                    <input
                    type="text"
                    value={period.endTime}
                    onChange={(e) => handleUpdate(period.id, 'endTime', e.target.value)}
                    onBlur={(e) => handleTimeInputBlur(period.id, 'endTime', e.target.value)}
                    placeholder="HH:MM"
                    maxLength={5}
                    className="w-20 text-base p-1 bg-white rounded border border-gray-200 text-gray-900 outline-none font-mono text-center font-bold h-8 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    />
                </div>

                <button 
                onClick={() => handleDelete(period.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                >
                <Trash2 size={18} />
                </button>
            </div>
            ))}

            <button 
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center font-bold text-sm"
            >
            <Plus size={16} className="mr-2" /> 
            {localPreferences.schoolLevel === 'MIDDLE' ? '45분' : '50분'} 수업/시간 추가
            </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center z-10">
        <button 
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
        >
            <RotateCcw size={14} className="mr-2" /> 초기화
        </button>
        <button
          onClick={handleSaveInternal}
          className="flex items-center px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg shadow-gray-300 font-bold text-sm transition-transform transform active:scale-95"
        >
          <Save size={16} className="mr-2" /> 저장 및 적용
        </button>
      </div>

      {/* Copy Modal Overlay */}
      {isCopyModalOpen && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">어떤 요일에 적용할까요?</h3>
                    <p className="text-xs text-gray-500">현재 ({days.find(d => d.id === selectedDay)?.label}요일) 시간표가 덮어씌워집니다.</p>
                </div>
                <div className="p-4 grid grid-cols-3 gap-2">
                    {days.filter(d => d.id !== selectedDay).map(day => (
                        <button
                            key={day.id}
                            onClick={() => toggleCopyTarget(day.id)}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                copyTargetDays.includes(day.id)
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            <span className="font-bold">{day.label}요일</span>
                            {copyTargetDays.includes(day.id) && <Check size={14} className="mt-1" />}
                        </button>
                    ))}
                </div>
                <div className="p-4 bg-gray-50 flex space-x-3">
                    <button 
                        onClick={() => setIsCopyModalOpen(false)}
                        className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100"
                    >
                        취소
                    </button>
                    <button 
                        onClick={executeCopy}
                        disabled={copyTargetDays.length === 0}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        적용하기
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Settings;