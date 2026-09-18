import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadgeRow,
  MuscleGroupLastTrainedRow,
  MuscleGroupRow,
  SetDayRow,
  SetTotalsRow,
  WorkoutDayRow,
  WorkoutTotalsRow,
} from '../types/coachQueryRows.types';
import { CoachProfileRow } from '../types/coachProfile.types';

@Injectable()
export class CoachRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCoachProfile(userId: number): Promise<CoachProfileRow> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        trainingGoal: true,
        trainingLevel: true,
        targetWorkoutDays: true,
      },
    });
  }

  getWorkoutTotals(userId: number, start: Date, end: Date) {
    return this.prisma.$queryRaw<WorkoutTotalsRow[]>`
        SELECT
            COUNT(*) AS sessions,
            COALESCE(SUM(w.durata_secondi), 0) AS durationSeconds
        FROM workouts w
        WHERE
            w.user_id = ${userId}
            AND w.ora_inizio >= ${start}
            AND w.ora_inizio < ${end}
            AND w.completato = 1
        `;
  }

  getSetTotals(userId: number, start: Date, end: Date) {
    return this.prisma.$queryRaw<SetTotalsRow[]>`
        SELECT
            COUNT(es.id) AS completedSets,
            COALESCE(SUM(COALESCE(es.carico, 0) * COALESCE(es.ripetizioni, 0)), 0) AS volume
        FROM workouts w
        JOIN workout_exercises we ON we.workout_id = w.id
        JOIN executed_sets es ON es.workout_exercise_id = we.id
        WHERE
            w.user_id = ${userId}
            AND w.ora_inizio >= ${start}
            AND w.ora_inizio < ${end}
            AND w.completato = 1
            AND es.completata = 1
        `;
  }

  getMuscleGroups(userId: number, start: Date, end: Date) {
    return this.prisma.$queryRaw<MuscleGroupRow[]>`
        SELECT
            we.gruppo_muscolare_snapshot AS name,
            COUNT(es.id) AS sets,
            COALESCE(SUM(COALESCE(es.carico, 0) * COALESCE(es.ripetizioni, 0)), 0) AS volume,
            COUNT(DISTINCT we.nome_snapshot) AS exerciseCount,
            MAX(w.ora_inizio) AS lastTrainedAt
        FROM workouts w
        JOIN workout_exercises we ON we.workout_id = w.id
        JOIN executed_sets es ON es.workout_exercise_id = we.id
        WHERE
            w.user_id = ${userId}
            AND w.ora_inizio >= ${start}
            AND w.ora_inizio < ${end}
            AND w.completato = 1
            AND es.completata = 1
        GROUP BY we.gruppo_muscolare_snapshot
        ORDER BY sets DESC
        `;
  }

  getWorkoutDays(userId: number, start: Date, end: Date) {
    return this.prisma.$queryRaw<WorkoutDayRow[]>`
        SELECT
            DATE(w.ora_inizio) AS date,
            COUNT(*) AS sessions,
            COALESCE(SUM(w.durata_secondi), 0) AS durationSeconds
        FROM workouts w
        WHERE
            w.user_id = ${userId}
            AND w.ora_inizio >= ${start}
            AND w.ora_inizio < ${end}
            AND w.completato = 1
        GROUP BY DATE(w.ora_inizio)
        ORDER BY date ASC
        `;
  }

  getSetDays(userId: number, start: Date, end: Date) {
    return this.prisma.$queryRaw<SetDayRow[]>`
        SELECT
            DATE(w.ora_inizio) AS date,
            COUNT(es.id) AS completedSets,
            COALESCE(SUM(COALESCE(es.carico , 0) * COALESCE(es.ripetizioni, 0)), 0) AS volume
        FROM workouts w
        JOIN workout_exercises we ON we.workout_id = w.id
        JOIN executed_sets es ON es.workout_exercise_id = we.id
        WHERE
            w.user_id = ${userId}
            AND w.ora_inizio >= ${start}
            AND w.ora_inizio < ${end}
            AND w.completato = 1
            AND es.completata = 1
        GROUP BY DATE (w.ora_inizio)
        ORDER BY date ASC
        `;
  }

  getBadges(userId: number, start: Date, end: Date) {
    return this.prisma.$queryRaw<BadgeRow[]>`
        SELECT
            ub.id AS id,
            bd.codice AS code,
            bd.nome AS name,
            e.nome AS exerciseName,
            ub.valore AS value,
            ub.ottenuto_il AS earnedAt
        FROM user_badges ub
        JOIN badge_definitions bd on bd.id = ub.badge_definition_id
        LEFT JOIN exercises e ON e.id = ub.exercise_id
        WHERE
            ub.user_id = ${userId}
            AND ub.ottenuto_il >= ${start}
            AND ub.ottenuto_il < ${end}
        ORDER BY ub.ottenuto_il DESC
        `;
  }

  getLastTrainedMuscleGroups(userId: number) {
    return this.prisma.$queryRaw<MuscleGroupLastTrainedRow[]>`
        SELECT
            we.gruppo_muscolare_snapshot AS name,
            MAX(w.ora_inizio) AS lastTrainedAt
        FROM workouts w
        JOIN workout_exercises we ON we.workout_id = w.id
        JOIN executed_sets es ON es.workout_exercise_id = we.id
        WHERE
            w.user_id = ${userId}
            AND w.completato = 1
            AND es.completata = 1
        GROUP BY we.gruppo_muscolare_snapshot
        `;
  }
}
