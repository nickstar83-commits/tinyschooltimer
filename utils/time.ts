import { Period, CurrentStatus, TimeFormat } from '../types';

/**
 * Converts "HH:mm" string to minutes from midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Adds minutes to a "HH:mm" time string and returns new "HH:mm" string
 */
export const addMinutes = (time: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Formats "HH:mm" string according to preference
 */
export const formatTimeValue = (time: string, format: TimeFormat): string => {
  if (format === '24h') return time;
  
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Converts "HH:mm" string to Date object for today
 */
export const timeToDate = (timeStr: string): Date => {
  const now = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const getCurrentTimeMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export const getDayName = (dayIndex: number): string => {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[dayIndex] || '';
};

export const analyzeSchedule = (schedule: Period[]): CurrentStatus => {
  const now = new Date();
  const currentMinutes = getCurrentTimeMinutes();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dayName = getDayName(now.getDay());

  // Handle empty schedule case
  if (!schedule || schedule.length === 0) {
    return {
      currentPeriod: null,
      nextPeriod: null,
      status: 'no_schedule',
      remainingSeconds: 0,
      totalDurationSeconds: 1,
      elapsedSeconds: 0,
      dayName
    };
  }

  // Sort schedule by start time just in case
  const sortedSchedule = [...schedule].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Check if before first period
  const firstPeriod = sortedSchedule[0];
  if (currentMinutes < timeToMinutes(firstPeriod.startTime)) {
     const startSeconds = timeToMinutes(firstPeriod.startTime) * 60;
     return {
      currentPeriod: null,
      nextPeriod: firstPeriod,
      status: 'before_school',
      remainingSeconds: startSeconds - nowSeconds,
      totalDurationSeconds: startSeconds, // Arbitrary base for progress 
      elapsedSeconds: 0,
      dayName
     };
  }

  // Check if after last period
  const lastPeriod = sortedSchedule[sortedSchedule.length - 1];
  if (currentMinutes >= timeToMinutes(lastPeriod.endTime)) {
    return {
      currentPeriod: null,
      nextPeriod: null,
      status: 'after_school',
      remainingSeconds: 0,
      totalDurationSeconds: 1,
      elapsedSeconds: 1,
      dayName
    };
  }

  // Check active period
  for (let i = 0; i < sortedSchedule.length; i++) {
    const period = sortedSchedule[i];
    const startMins = timeToMinutes(period.startTime);
    const endMins = timeToMinutes(period.endTime);

    if (currentMinutes >= startMins && currentMinutes < endMins) {
      const startSecs = startMins * 60;
      const endSecs = endMins * 60;
      const total = endSecs - startSecs;
      const elapsed = nowSeconds - startSecs;
      const remaining = endSecs - nowSeconds;

      return {
        currentPeriod: period,
        nextPeriod: sortedSchedule[i + 1] || null,
        status: 'active',
        remainingSeconds: remaining,
        totalDurationSeconds: total,
        elapsedSeconds: elapsed,
        dayName
      };
    }
  }

  // If we are here, we are in a gap between periods (e.g., waiting for next class but not defined as a break)
  // Find the next upcoming period
  const nextPeriod = sortedSchedule.find(p => timeToMinutes(p.startTime) > currentMinutes);
  
  if (nextPeriod) {
    const startSecs = timeToMinutes(nextPeriod.startTime) * 60;
    const remaining = startSecs - nowSeconds;
    return {
        currentPeriod: null,
        nextPeriod: nextPeriod,
        status: 'gap',
        remainingSeconds: remaining,
        totalDurationSeconds: remaining + 60, // approximate
        elapsedSeconds: 60,
        dayName
    };
  }

  return {
      currentPeriod: null,
      nextPeriod: null,
      status: 'after_school',
      remainingSeconds: 0,
      totalDurationSeconds: 1,
      elapsedSeconds: 1,
      dayName
  };
};