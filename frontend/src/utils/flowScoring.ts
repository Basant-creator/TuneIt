import { Track } from '../data/presetTracks';

export interface ParsedCamelotKey {
  num: number;
  letter: string;
}

/**
 * Parses a Camelot key string (e.g., "8A", "12B") into its numeric step and letter mode.
 */
export function parseCamelotKey(key: string): ParsedCamelotKey | null {
  if (!key || key.length < 2) return null;
  const num = parseInt(key.slice(0, -1), 10);
  const letter = key.slice(-1);
  if (isNaN(num)) return null;
  return { num, letter };
}

export function areKeysCompatible(k1: string, k2: string): boolean {
  if (k1 === k2) return true;

  const parsed1 = parseCamelotKey(k1);
  const parsed2 = parseCamelotKey(k2);
  if (!parsed1 || !parsed2) return false;

  if (parsed1.num === parsed2.num) return true; // relative shift
  if (parsed1.letter === parsed2.letter) {
    const diff = Math.abs(parsed1.num - parsed2.num);
    if (diff === 1 || diff === 11) return true;
  }

  return false;
}

export function getCamelotDistance(k1: string, k2: string): number {
  if (k1 === k2) return 0;

  const parsed1 = parseCamelotKey(k1);
  const parsed2 = parseCamelotKey(k2);
  if (!parsed1 || !parsed2) return 12;

  const { num: num1, letter: letter1 } = parsed1;
  const { num: num2, letter: letter2 } = parsed2;

  if (letter1 === letter2) {
    const diff = Math.abs(num1 - num2);
    return Math.min(diff, 12 - diff);
  }

  if (num1 === num2) return 1;

  const diff = Math.abs(num1 - num2);
  const cyclicDiff = Math.min(diff, 12 - diff);
  return cyclicDiff + 1;
}

export function getEffectiveBpm(bpm: number): number {
  return bpm > 140 ? bpm / 2 : bpm;
}

export function getTransitionPenalty(t1: Track, t2: Track, modeId: string, nextIndex: number): number {
  const bpm1 = getEffectiveBpm(t1.bpm);
  const bpm2 = getEffectiveBpm(t2.bpm);
  const bpmDiff = Math.abs(bpm1 - bpm2);
  const keyDist = getCamelotDistance(t1.key, t2.key);
  const keyComp = keyDist <= 1;

  if (modeId === 'bu') {
    let penalty = 0;
    if (t2.energy < t1.energy) {
      penalty += (t1.energy - t2.energy) * 80;
    }
    if (bpm2 < bpm1) {
      penalty += (bpm1 - bpm2) * 4;
    }
    if (!keyComp) {
      penalty += 15;
    }
    return penalty + bpmDiff + keyDist * 2;
  }

  if (modeId === 'cm') {
    const targets = [0.65, 0.75, 0.85, 0.60, 0.80];
    const targetEnergy = targets[nextIndex] ?? 0.7;
    let penalty = Math.abs(t2.energy - targetEnergy) * 50;
    if (!keyComp) {
      penalty += 12;
    }
    return penalty + bpmDiff * 1.5;
  }

  if (modeId === 'ph') {
    let penalty = 0;
    if (t2.energy < 0.65) {
      penalty += (0.65 - t2.energy) * 30;
    }
    if (bpmDiff < 5) {
      penalty += 5;
    } else if (bpmDiff > 35) {
      penalty += (bpmDiff - 35) * 2;
    }
    if (!keyComp && keyDist > 2) {
      penalty += 8;
    }
    return penalty;
  }

  // Drift ('df')
  let penalty = bpmDiff * 4 + Math.abs(t1.energy - t2.energy) * 30;
  if (!keyComp) {
    penalty += 15;
  }
  return penalty;
}

export function getTransitionScore(t1: Track, t2: Track, modeId: string, nextIndex: number): number {
  const bpm1 = getEffectiveBpm(t1.bpm);
  const bpm2 = getEffectiveBpm(t2.bpm);
  const bpmDiff = Math.abs(bpm1 - bpm2);
  const keyDist = getCamelotDistance(t1.key, t2.key);

  if (modeId === 'bu') {
    let score = 80;
    if (t2.energy >= t1.energy) score += 10;
    else score -= (t1.energy - t2.energy) * 50;

    if (bpm2 >= bpm1) score += 5;
    else score -= (bpm1 - bpm2) * 2;

    if (keyDist === 0) score += 5;
    else if (keyDist === 1) score += 3;
    else score -= 10;

    return Math.max(30, Math.min(100, Math.round(score)));
  }

  if (modeId === 'cm') {
    const targets = [0.65, 0.75, 0.85, 0.60, 0.80];
    const targetEnergy = targets[nextIndex] ?? 0.7;
    let score = 85;

    const energyDeviation = Math.abs(t2.energy - targetEnergy);
    score -= energyDeviation * 60;

    if (keyDist <= 1) score += 10;
    else score -= 10;

    if (bpmDiff <= 15) score += 5;
    else score -= 5;

    return Math.max(30, Math.min(100, Math.round(score)));
  }

  if (modeId === 'ph') {
    let score = 80;
    if (bpmDiff >= 8 && bpmDiff <= 30) score += 10;
    else if (bpmDiff > 30) score -= (bpmDiff - 30) * 1.5;

    if (keyDist === 1 || keyDist === 2) score += 10;
    else if (keyDist === 0) score += 5;
    else score -= 5;

    if (t2.energy > 0.75) score += 5;

    return Math.max(30, Math.min(100, Math.round(score)));
  }

  // Drift ('df')
  let score = 75;
  if (bpmDiff <= 5) score += 12;
  else if (bpmDiff <= 15) score += 6;

  if (keyDist === 0) score += 13;
  else if (keyDist === 1) score += 10;

  const energyDiff = Math.abs(t1.energy - t2.energy);
  if (energyDiff <= 0.1) score += 5;

  return Math.max(30, Math.min(100, Math.round(score)));
}
