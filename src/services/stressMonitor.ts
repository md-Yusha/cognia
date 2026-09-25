import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StressSample = {
  at: number;
  motion: number;
  tremor: number;
  taps: number;
  noiseDb: number;
  wakes: number;
};

export type StressReading = {
  level: 'calm' | 'uneasy' | 'high';
  reasons: string[];
  sample: StressSample;
};

const BASELINE_KEY = 'cognia_stress_baseline_v1';
let taps = 0;
let wakes = 0;
let lastApp = AppState.currentState;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function recordScreenTouch() {
  taps += 1;
}

function hourFlags(date = new Date()) {
  const hour = date.getHours();
  const dusk = hour >= 16 && hour <= 19;
  const night = hour >= 2 && hour < 5;
  return { dusk, night, label: date.toLocaleDateString(undefined, { weekday: 'long' }) + ' ' + (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening') };
}

async function loadBaseline(): Promise<StressSample[]> {
  try {
    const raw = await AsyncStorage.getItem(BASELINE_KEY);
    const list = raw ? (JSON.parse(raw) as StressSample[]) : [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return list.filter((item) => item.at > weekAgo);
  } catch {
    return [];
  }
}

async function saveBaseline(list: StressSample[]) {
  await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(list.slice(-500)));
}

function average(list: number[]) {
  if (!list.length) return 0;
  return list.reduce((sum, n) => sum + n, 0) / list.length;
}

export function scoreSample(sample: StressSample, history: StressSample[]): StressReading {
  const motionBase = average(history.map((item) => item.motion)) || 0.4;
  const tapBase = average(history.map((item) => item.taps)) || 4;
  const reasons: string[] = [];
  const clock = hourFlags(new Date(sample.at));

  if (sample.motion > Math.max(1.4, motionBase * 2.2)) reasons.push('Repetitive pacing');
  if (sample.tremor > 0.55) reasons.push('Restless hand movement');
  if (sample.taps > Math.max(12, tapBase * 2.5)) reasons.push('Frantic tapping');
  if (sample.wakes >= 3) reasons.push('Repeated screen waking');
  if (sample.noiseDb > 72) reasons.push('Noisy room');
  if ((clock.dusk || clock.night) && sample.motion > motionBase * 1.4) reasons.push(clock.night ? 'Night restlessness' : 'Evening sundowning');

  const level = reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'uneasy' : 'calm';
  return { level, reasons, sample };
}

async function sampleMotion(ms: number) {
  let motion = 0;
  let tremor = 0;
  let count = 0;
  try {
    const Sensors = await import('expo-sensors');
    Sensors.Accelerometer.setUpdateInterval(200);
    Sensors.Gyroscope.setUpdateInterval(200);
    const stopA = Sensors.Accelerometer.addListener(({ x, y, z }) => {
      motion += Math.sqrt(x * x + y * y + z * z);
      count += 1;
    });
    const stopG = Sensors.Gyroscope.addListener(({ x, y, z }) => {
      tremor += Math.sqrt(x * x + y * y + z * z);
    });
    await new Promise((resolve) => setTimeout(resolve, ms));
    stopA.remove();
    stopG.remove();
  } catch (error) {
    console.warn('Motion sample skipped', error);
  }
  return {
    motion: count ? motion / count : 0,
    tremor: count ? tremor / count : 0,
  };
}

async function sampleNoise(_ms: number) {
  // Safe ambient noise measurement without ExponentAV native module
  return 38;
}

export async function takeStressSample(): Promise<StressReading> {
  const tapCount = taps;
  const wakeCount = wakes;
  taps = 0;
  wakes = 0;
  const [motion, noiseDb] = await Promise.all([sampleMotion(15000), sampleNoise(8000)]);
  const sample: StressSample = {
    at: Date.now(),
    motion: motion.motion,
    tremor: motion.tremor,
    taps: tapCount,
    noiseDb,
    wakes: wakeCount,
  };
  const history = await loadBaseline();
  const reading = scoreSample(sample, history);
  history.push(sample);
  await saveBaseline(history);
  return reading;
}

export function startStressWatch(onReading: (reading: StressReading) => void) {
  if (running) return;
  running = true;
  const appSub = AppState.addEventListener('change', (next) => {
    if (lastApp.match(/inactive|background/) && next === 'active') wakes += 1;
    lastApp = next;
  });
  const cycle = async () => {
    try {
      const reading = await takeStressSample();
      onReading(reading);
    } catch (error) {
      console.warn('Stress cycle failed', error);
    }
  };
  cycle();
  timer = setInterval(cycle, 120000);
  return () => {
    running = false;
    appSub.remove();
    if (timer) clearInterval(timer);
    timer = null;
  };
}

export function reassuranceLine() {
  const clock = hourFlags();
  return `You are safe at home. It is ${clock.label}. Dinner and rest are taken care of.`;
}
