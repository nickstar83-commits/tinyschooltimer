export enum PeriodType {
  CLASS = 'CLASS',
  BREAK = 'BREAK',
  LUNCH = 'LUNCH',
  OTHER = 'OTHER'
}

export interface Period {
  id: string;
  name: string;
  startTime: string; // Format "HH:mm"
  endTime: string;   // Format "HH:mm"
  type: PeriodType;
}

// Key is day number (0=Sun, 1=Mon, ..., 6=Sat)
export type WeeklySchedule = Record<number, Period[]>;

export interface CurrentStatus {
  currentPeriod: Period | null;
  nextPeriod: Period | null;
  status: 'active' | 'before_school' | 'after_school' | 'gap' | 'no_schedule';
  remainingSeconds: number;
  totalDurationSeconds: number;
  elapsedSeconds: number;
  dayName: string;
}

export type TimeFormat = '12h' | '24h';
export type SchoolLevel = 'MIDDLE' | 'HIGH';

export interface AppPreferences {
  timeFormat: TimeFormat;
  schoolLevel: SchoolLevel;
  opacity: number; // 0.1 to 1.0
}