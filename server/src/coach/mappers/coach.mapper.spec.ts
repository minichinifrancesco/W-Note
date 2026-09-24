import {
  toBadgeSummaryDto,
  toComparisonDto,
  toDayDtos,
  toMuscleGroupDtos,
  toPeriodDto,
  toTotalsDto,
} from './coach.mapper';

describe('coach.mapper', () => {
  describe('toPeriodDto', () => {
    it('serializes an inclusive weekly label and ISO boundaries', () => {
      const result = toPeriodDto({
        start: new Date('2026-09-14T00:00:00.000Z'),
        end: new Date('2026-09-21T00:00:00.000Z'),
      });

      expect(result).toEqual({
        start: '2026-09-14T00:00:00.000Z',
        end: '2026-09-21T00:00:00.000Z',
        label: '14/09/2026 - 20/09/2026',
      });
    });
  });

  describe('toTotalsDto', () => {
    it('maps totals and calculates the rounded average duration', () => {
      expect(
        toTotalsDto(
          {
            sessions: 3,
            durationSeconds: 5500,
          },
          {
            completedSets: 18,
            volume: 4200,
          },
        ),
      ).toEqual({
        sessions: 3,
        durationSeconds: 5500,
        completedSets: 18,
        volume: 4200,
        averageDurationSeconds: 1833,
      });
    });

    it('returns zeroes when aggregate rows are missing', () => {
      expect(toTotalsDto()).toEqual({
        sessions: 0,
        durationSeconds: 0,
        completedSets: 0,
        volume: 0,
        averageDurationSeconds: 0,
      });
    });
  });

  describe('toMuscleGroupDtos', () => {
    it('maps all tracked groups, applies thresholds and uses historical training dates', () => {
      const result = toMuscleGroupDtos(
        [
          {
            name: 'Petto',
            sets: 1,
            volume: 100,
            exerciseCount: 1,
            lastTrainedAt: null,
          },
          {
            name: 'Schiena',
            sets: 3,
            volume: 200,
            exerciseCount: 1,
            lastTrainedAt: new Date('2026-09-18T10:00:00.000Z'),
          },
          {
            name: 'Spalle',
            sets: 4,
            volume: 300,
            exerciseCount: 1,
            lastTrainedAt: null,
          },
          {
            name: 'Bicipiti',
            sets: 12,
            volume: 400,
            exerciseCount: 1,
            lastTrainedAt: null,
          },
          {
            name: 'Tricipiti',
            sets: 13,
            volume: 500,
            exerciseCount: 1,
            lastTrainedAt: null,
          },
        ],
        [
          {
            name: 'Petto',
            lastTrainedAt: new Date('2026-09-17T10:00:00.000Z'),
          },
        ],
      );

      expect(result).toHaveLength(9);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Gambe e glutei',
            sets: 0,
            status: 'none',
            lastTrainedAt: null,
          }),
          expect.objectContaining({
            name: 'Petto',
            sets: 1,
            status: 'low',
            lastTrainedAt: '2026-09-17T10:00:00.000Z',
          }),
          expect.objectContaining({
            name: 'Schiena',
            sets: 3,
            status: 'low',
            lastTrainedAt: '2026-09-18T10:00:00.000Z',
          }),
          expect.objectContaining({
            name: 'Spalle',
            sets: 4,
            status: 'ok',
          }),
          expect.objectContaining({
            name: 'Bicipiti',
            sets: 12,
            status: 'ok',
          }),
          expect.objectContaining({
            name: 'Tricipiti',
            sets: 13,
            status: 'high',
          }),
        ]),
      );
    });

    it('uses the date from the current period before the historical fallback', () => {
      const result = toMuscleGroupDtos(
        [
          {
            name: 'Petto',
            sets: 6,
            volume: 800,
            exerciseCount: 2,
            lastTrainedAt: new Date('2026-09-19T10:00:00.000Z'),
          },
        ],
        [
          {
            name: 'Petto',
            lastTrainedAt: new Date('2026-09-10T10:00:00.000Z'),
          },
        ],
      );

      expect(result.find((group) => group.name === 'Petto')).toEqual(
        expect.objectContaining({
          lastTrainedAt: '2026-09-19T10:00:00.000Z',
        }),
      );
    });
  });

  describe('toDayDtos', () => {
    it('merges workout and set aggregates, sorts days and ignores orphan set rows', () => {
      expect(
        toDayDtos(
          [
            {
              date: '2026-09-16',
              sessions: 1,
              durationSeconds: 1800,
            },
            {
              date: '2026-09-14',
              sessions: 2,
              durationSeconds: 3600,
            },
          ],
          [
            {
              date: '2026-09-14',
              completedSets: 12,
              volume: 3000,
            },
            {
              date: '2026-09-15',
              completedSets: 8,
              volume: 2000,
            },
          ],
        ),
      ).toEqual([
        {
          date: '2026-09-14',
          sessions: 2,
          durationSeconds: 3600,
          completedSets: 12,
          volume: 3000,
        },
        {
          date: '2026-09-16',
          sessions: 1,
          durationSeconds: 1800,
          completedSets: 0,
          volume: 0,
        },
      ]);
    });
  });

  describe('toBadgeSummaryDto', () => {
    it('maps badges, keeps null values and counts earned items', () => {
      expect(
        toBadgeSummaryDto([
          {
            id: 7,
            code: 'FIRST_WORKOUT',
            name: 'Primo allenamento',
            exerciseName: null,
            value: null,
            earnedAt: new Date('2026-09-14T10:00:00.000Z'),
          },
        ]),
      ).toEqual({
        earned: 1,
        items: [
          {
            id: 7,
            code: 'FIRST_WORKOUT',
            name: 'Primo allenamento',
            exerciseName: null,
            value: null,
            earnedAt: '2026-09-14T10:00:00.000Z',
          },
        ],
      });
    });
  });

  describe('toComparisonDto', () => {
    it('calculates deltas and the volume percentage', () => {
      expect(
        toComparisonDto(
          {
            sessions: 3,
            durationSeconds: 5400,
            completedSets: 18,
            volume: 1250,
            averageDurationSeconds: 1800,
          },
          {
            sessions: 2,
            durationSeconds: 3600,
            completedSets: 12,
            volume: 1000,
            averageDurationSeconds: 1800,
          },
        ),
      ).toEqual({
        sessionsDelta: 1,
        durationSecondsDelta: 1800,
        completedSetsDelta: 6,
        volumeDelta: 250,
        volumeDeltaPercent: 25,
      });
    });

    it('uses 100 percent when previous volume is zero and current volume is positive', () => {
      expect(
        toComparisonDto(
          {
            sessions: 1,
            durationSeconds: 1800,
            completedSets: 6,
            volume: 500,
            averageDurationSeconds: 1800,
          },
          {
            sessions: 0,
            durationSeconds: 0,
            completedSets: 0,
            volume: 0,
            averageDurationSeconds: 0,
          },
        ),
      ).toEqual(
        expect.objectContaining({
          volumeDelta: 500,
          volumeDeltaPercent: 100,
        }),
      );
    });
  });
});
