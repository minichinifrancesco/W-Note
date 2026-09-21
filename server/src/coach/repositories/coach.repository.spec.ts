import { PrismaService } from '../../prisma/prisma.service';
import { CoachRepository } from './coach.repository';

type QueryCall = {
  sql: string;
  parameters: unknown[];
};

function createRepository() {
  const queryCalls: QueryCall[] = [];
  const profileCalls: unknown[] = [];

  const queryRaw = (
    queryParts: TemplateStringsArray,
    ...parameters: unknown[]
  ): Promise<unknown[]> => {
    queryCalls.push({
      sql: queryParts.join('?'),
      parameters,
    });
    return Promise.resolve([]);
  };

  const findUniqueOrThrow = (arguments_: unknown): Promise<unknown> => {
    profileCalls.push(arguments_);

    return Promise.resolve({});
  };

  const prisma = {
    $queryRaw: queryRaw,
    user: {
      findUniqueOrThrow,
    },
  } as unknown as PrismaService;

  return {
    repository: new CoachRepository(prisma),
    queryCalls,
    profileCalls,
  };
}

function getSingleQuery(queryCalls: QueryCall[]): QueryCall {
  expect(queryCalls).toHaveLength(1);

  return queryCalls[0];
}

describe('CoachRepository', () => {
  const userId = 42;
  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-09-01T00:00:00.000Z');

  it('loads only the coach profile fields required by the rules', async () => {
    const { repository, profileCalls } = createRepository();
    await repository.getCoachProfile(userId);

    expect(profileCalls).toEqual([
      {
        where: { id: userId },
        select: {
          trainingGoal: true,
          trainingLevel: true,
          targetWorkoutDays: true,
        },
      },
    ]);
  });

  it('queries totals from completed workouts in the requested period', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getWorkoutTotals(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('FROM workouts w');
    expect(sql).toContain('COUNT(*) AS sessions');
    expect(sql).toContain('SUM(w.durata_secondi)');
    expect(sql).toContain('w.completato = 1');
  });

  it('queries completed set totals and volume in the requested period', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getSetTotals(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('JOIN workout_exercises we');
    expect(sql).toContain('JOIN executed_sets es');
    expect(sql).toContain('COUNT(es.id) AS completedSets');
    expect(sql).toContain('COALESCE(es.carico, 0)');
    expect(sql).toContain('COALESCE(es.ripetizioni, 0)');
    expect(sql).toContain('w.completato = 1');
    expect(sql).toContain('es.completata = 1');
  });

  it('queries muscle groups with grouping, volume and last trained date', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getMuscleGroups(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('we.gruppo_muscolare_snapshot AS name');
    expect(sql).toContain('COUNT(DISTINCT we.nome_snapshot)');
    expect(sql).toContain('MAX(w.ora_inizio) AS lastTrainedAt');
    expect(sql).toContain('GROUP BY we.gruppo_muscolare_snapshot');
    expect(sql).toContain('ORDER BY sets DESC');
    expect(sql).toContain('es.completata = 1');
  });

  it('queries completed workouts grouped by day', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getWorkoutDays(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('DATE(w.ora_inizio) AS date');
    expect(sql).toContain('GROUP BY DATE(w.ora_inizio)');
    expect(sql).toContain('ORDER BY date ASC');
    expect(sql).toContain('w.completato = 1');
  });

  it('queries completed sets grouped by day', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getSetDays(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('DATE(w.ora_inizio) AS date');
    expect(sql).toContain('COUNT(es.id) AS completedSets');
    expect(sql).toContain('GROUP BY DATE (w.ora_inizio)');
    expect(sql).toContain('ORDER BY date ASC');
    expect(sql).toContain('es.completata = 1');
  });

  it('queries badges earned in the requested period', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getBadges(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('FROM user_badges ub');
    expect(sql).toContain('JOIN badge_definitions bd');
    expect(sql).toContain('LEFT JOIN exercises e');
    expect(sql).toContain('ub.user_id =');
    expect(sql).toContain('ub.ottenuto_il >=');
    expect(sql).toContain('ORDER BY ub.ottenuto_il DESC');
  });

  it('queries completed historical performance sets for an exercise trend', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getExercisePerformanceSets(userId, start, end);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId, start, end]);
    expect(sql).toContain('FROM workouts w');
    expect(sql).toContain('JOIN workout_exercises we');
    expect(sql).toContain('JOIN executed_sets es');
    expect(sql).toContain('we.exercise_id AS exerciseId');
    expect(sql).toContain('we.nome_snapshot AS exerciseName');
    expect(sql).toContain('w.ora_inizio AS performedAt');
    expect(sql).toContain('we.gruppo_muscolare_snapshot AS muscleGroup');
    expect(sql).toContain('we.tipo_tracciamento_snapshot AS trackingType');
    expect(sql).toContain('es.carico AS load');
    expect(sql).toContain('es.ripetizioni AS reps');
    expect(sql).toContain('w.ora_inizio >=');
    expect(sql).toContain('w.ora_inizio <');
    expect(sql).toContain('w.completato = 1');
    expect(sql).toContain('es.completata = 1');
    expect(sql).toContain('COALESCE(es.carico, 0) > 0');
    expect(sql).toContain('COALESCE(es.ripetizioni, 0) > 0');
    expect(sql).toContain('ORDER BY w.ora_inizio ASC');
  });

  it('queries the latest completed training date for each muscle group', async () => {
    const { repository, queryCalls } = createRepository();
    await repository.getLastTrainedMuscleGroups(userId);
    const { sql, parameters } = getSingleQuery(queryCalls);

    expect(parameters).toEqual([userId]);
    expect(sql).toContain('we.gruppo_muscolare_snapshot AS name');
    expect(sql).toContain('MAX(w.ora_inizio) AS lastTrainedAt');
    expect(sql).toContain('GROUP BY we.gruppo_muscolare_snapshot');
    expect(sql).toContain('w.completato = 1');
    expect(sql).toContain('es.completata = 1');
  });
});
