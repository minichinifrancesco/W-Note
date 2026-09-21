import { BadRequestException } from '@nestjs/common';
import {
  getExerciseTrendPeriod,
  getPreviousPeriod,
  getWeekPeriod,
} from './coachPeriod.util';

function expectLocalDate(
  date: Date,
  year: number,
  month: number,
  day: number,
): void {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month);
  expect(date.getDate()).toBe(day);
}

describe('getWeekPeriod', () => {
  it('normalizes a weekday to the Monday of its week', () => {
    const result = getWeekPeriod('2026-09-16');

    expectLocalDate(result.start, 2026, 8, 14);
    expect(result.start.getHours()).toBe(0);
    expectLocalDate(result.end, 2026, 8, 21);
    expect(result.end.getHours()).toBe(0);
  });

  it('uses the previous Monday when the input date is Sunday', () => {
    const result = getWeekPeriod('2026-09-20');

    expectLocalDate(result.start, 2026, 8, 14);
    expectLocalDate(result.end, 2026, 8, 21);
  });

  it('uses the current date when weekStart is omitted', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 16, 12, 0, 0));

    try {
      const result = getWeekPeriod();

      expectLocalDate(result.start, 2026, 8, 14);
      expectLocalDate(result.end, 2026, 8, 21);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['', 'not-a-date', '2026-02-30', '2026-9-01'])(
    'rejects an invalid weekStart: %s',
    (weekStart) => {
      expect(() => getWeekPeriod(weekStart)).toThrow(BadRequestException);
    },
  );
});

describe('getPreviousPeriod', () => {
  it('moves both boundaries back by one week without mutating the input', () => {
    const period = {
      start: new Date(2026, 8, 14, 0, 0, 0),
      end: new Date(2026, 8, 21, 0, 0, 0),
    };
    const result = getPreviousPeriod(period);

    expectLocalDate(result.start, 2026, 8, 7);
    expectLocalDate(result.end, 2026, 8, 14);
    expectLocalDate(period.start, 2026, 8, 14);
    expectLocalDate(period.end, 2026, 8, 21);
  });
});

describe('getExerciseTrendPeriod', () => {
  it('creates a twelve-week historical period ending with the selected week', () => {
    const period = {
      start: new Date(2026, 0, 5, 0, 0, 0),
      end: new Date(2026, 0, 12, 0, 0, 0),
    };
    const result = getExerciseTrendPeriod(period);

    expectLocalDate(result.start, 2025, 9, 20);
    expectLocalDate(result.end, 2026, 0, 12);
    expectLocalDate(period.start, 2026, 0, 5);
    expectLocalDate(period.end, 2026, 0, 12);
  });
});
