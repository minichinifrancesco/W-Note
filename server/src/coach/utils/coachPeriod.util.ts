import { BadRequestException } from '@nestjs/common';
import { CoachPeriod } from '../types/coachQueryRows.types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const EXERCISE_TREND_LOOKBACK_DAYS = 84;
export type CoachPeriodStatus = 'CURRENT' | 'HISTORICAL';

function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isValidWeekStart(value: string, date: Date): boolean {
  if (!ISO_DATE_PATTERN.test(value) || Number.isNaN(date.getTime())) {
    return false;
  }

  const normalizedDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  return normalizedDate === value;
}

export function getWeekPeriod(weekStart?: string): CoachPeriod {
  const baseDate = weekStart ? new Date(`${weekStart}T00:00:00`) : new Date();

  if (
    (weekStart !== undefined && !isValidWeekStart(weekStart, baseDate)) ||
    Number.isNaN(baseDate.getTime())
  ) {
    throw new BadRequestException('weekStart non valido');
  }

  const day = baseDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

export function getCoachPeriodStatus(
  period: CoachPeriod,
  referenceDate = new Date(),
): CoachPeriodStatus {
  const currentPeriod = getWeekPeriod(toLocalDateKey(referenceDate));

  if (period.start.getTime() > currentPeriod.start.getTime()) {
    throw new BadRequestException(
      'Non è possibile richiedere settimane future',
    );
  }

  if (period.start.getTime() < currentPeriod.start.getTime()) {
    return 'HISTORICAL';
  }

  return 'CURRENT';
}

export function getPreviousPeriod(period: CoachPeriod): CoachPeriod {
  const start = new Date(period.start);
  start.setDate(start.getDate() - 7);

  const end = new Date(period.end);
  end.setDate(end.getDate() - 7);

  return { start, end };
}

export function getExerciseTrendPeriod(period: CoachPeriod): CoachPeriod {
  const start = new Date(period.end);
  start.setDate(start.getDate() - EXERCISE_TREND_LOOKBACK_DAYS);

  return {
    start,
    end: new Date(period.end),
  };
}
