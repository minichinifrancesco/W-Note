/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  type TestUser = {
    id: number;
    email: string;
    passwordHash: string;
    name: string;
    surname: string;
    birthDate: Date;
    gender: string;
    weight: number | null;
    heightCm: number | null;
    registrationDate: Date;
    createdAt: Date;
    updatedAt: Date;
    trainingGoal: string;
    trainingLevel: string;
    targetWorkoutDays: number;
  };

  type TestResetCode = {
    id: number;
    userId: number;
    codeHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    attempts: number;
    createdAt: Date;
  };

  const users: TestUser[] = [];
  const resetCodes: TestResetCode[] = [];
  let nextUserId = 1;
  let nextResetCodeId = 1;

  const sendPasswordResetCode = jest.fn<Promise<void>, [string, string]>();

  const selectFields = <T extends Record<string, unknown>>(
    record: T,
    select?: Record<string, boolean>,
  ) => {
    if (!select) return record;

    return Object.fromEntries(
      Object.entries(select)
        .filter(([, enabled]) => enabled)
        .map(([key]) => [key, record[key]]),
    );
  };

  const matchesResetCodeWhere = (
    resetCode: TestResetCode,
    where: Record<string, any> = {},
  ) => {
    if (where.userId !== undefined && resetCode.userId !== where.userId) {
      return false;
    }
    if (where.usedAt === null && resetCode.usedAt !== null) {
      return false;
    }
    if (where.id?.not !== undefined && resetCode.id === where.id.not) {
      return false;
    }
    return true;
  };

  const prisma = {
    user: {
      findUnique: jest.fn(async (request: any) => {
        const where = request?.where || {};
        const user =
          where.email !== undefined
            ? users.find((item) => item.email === where.email)
            : users.find((item) => item.id === where.id);

        return user ? selectFields(user, request?.select) : null;
      }),
      create: jest.fn(async (request: any) => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const user: TestUser = {
          id: nextUserId++,
          ...request.data,
          weight: null,
          heightCm: null,
          trainingGoal: request.data.trainingGoal ?? 'GENERALE',
          trainingLevel: request.data.trainingLevel ?? 'PRINCIPIANTE',
          targetWorkoutDays: request.data.targetWorkoutDays ?? 3,
          registrationDate: now,
          createdAt: now,
          updatedAt: now,
        };
        users.push(user);
        return user;
      }),
      update: jest.fn(async (request: any) => {
        const user = users.find((item) => item.id === request.where.id);
        if (!user) throw new Error('User not found');
        Object.assign(user, request.data, { updatedAt: new Date() });
        return user;
      }),
    },
    passwordResetCode: {
      findFirst: jest.fn(async (request: any) => {
        const matches = resetCodes
          .filter((resetCode) =>
            matchesResetCodeWhere(resetCode, request?.where),
          )
          .sort((a, b) => {
            if (request?.orderBy?.createdAt === 'desc') {
              return b.createdAt.getTime() - a.createdAt.getTime();
            }
            return a.createdAt.getTime() - b.createdAt.getTime();
          });

        return matches[0] || null;
      }),
      create: jest.fn(async (request: any) => {
        const resetCode: TestResetCode = {
          id: nextResetCodeId++,
          attempts: 0,
          usedAt: null,
          createdAt: new Date(),
          ...request.data,
        };
        resetCodes.push(resetCode);
        return resetCode;
      }),
      update: jest.fn(async (request: any) => {
        const resetCode = resetCodes.find(
          (item) => item.id === request.where.id,
        );
        if (!resetCode) throw new Error('Reset code not found');

        if (request.data.attempts?.increment) {
          resetCode.attempts += request.data.attempts.increment;
        }
        if (request.data.usedAt !== undefined) {
          resetCode.usedAt = request.data.usedAt;
        }
        return resetCode;
      }),
      updateMany: jest.fn(async (request: any) => {
        const matches = resetCodes.filter((resetCode) =>
          matchesResetCodeWhere(resetCode, request?.where),
        );
        matches.forEach((resetCode) => {
          if (request.data.usedAt !== undefined) {
            resetCode.usedAt = request.data.usedAt;
          }
        });
        return { count: matches.length };
      }),
      delete: jest.fn(async (request: any) => {
        const index = resetCodes.findIndex(
          (resetCode) => resetCode.id === request.where.id,
        );
        if (index >= 0) {
          return resetCodes.splice(index, 1)[0];
        }
        throw new Error('Reset code not found');
      }),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback(prisma),
    ),
  };

  const mailService = {
    sendPasswordResetCode,
  };

  let service: AuthService;

  const createRegisteredUser = async (email = 'test@example.com') => {
    await service.register({
      email,
      password: 'Secret1!',
      name: 'Mario',
      surname: 'Rossi',
      birthDate: '2000-06-15',
      gender: 'NON_SPECIFICATO',
    });
    return users[users.length - 1];
  };

  const requestResetAndReadCode = async (email = 'test@example.com') => {
    await service.requestPasswordReset(email);
    const lastCall =
      sendPasswordResetCode.mock.calls[
        sendPasswordResetCode.mock.calls.length - 1
      ];
    return lastCall[1];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users.length = 0;
    resetCodes.length = 0;
    nextUserId = 1;
    nextResetCodeId = 1;
    sendPasswordResetCode.mockResolvedValue(undefined);
    service = new AuthService(prisma, mailService as unknown as MailService);
  });

  it('stores date-only birth dates without timezone shifts', async () => {
    const response = await service.register({
      email: ' Test@Example.com ',
      password: 'Secret1!',
      name: 'Mario',
      surname: 'Rossi',
      birthDate: '2000-06-15',
      gender: 'MASCHIO',
    });

    expect(users[0].email).toBe('test@example.com');
    expect(users[0].birthDate).toEqual(new Date('2000-06-15T00:00:00.000Z'));
    expect(users[0].gender).toBe('MASCHIO');
    expect(response.user.gender).toBe('MASCHIO');
    expect(response.user.birthDate).toEqual(
      new Date('2000-06-15T00:00:00.000Z'),
    );
  });

  it('returns default coach profile fields on registration', async () => {
    const response = await service.register({
      email: 'coach@example.com',
      password: 'Secret1!',
      name: 'Mario',
      surname: 'Rossi',
      birthDate: '2000-06-15',
      gender: 'MASCHIO',
    });

    expect(response.user.trainingGoal).toBe('GENERALE');
    expect(response.user.trainingLevel).toBe('PRINCIPIANTE');
    expect(response.user.targetWorkoutDays).toBe(3);
  });

  it('rejects impossible calendar dates', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'Secret1!',
        name: 'Mario',
        surname: 'Rossi',
        birthDate: '2000-02-31',
        gender: 'NON_SPECIFICATO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a recognizable conflict for an existing account', async () => {
    await createRegisteredUser();

    await expect(
      service.register({
        email: 'test@example.com',
        password: 'Secret1!',
        name: 'Mario',
        surname: 'Rossi',
        birthDate: '2000-06-15',
        gender: 'NON_SPECIFICATO',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(users).toHaveLength(1);
  });

  it('requires name, surname and birth date during registration', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'Secret1!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects weak passwords during registration', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'secret1',
        name: 'Mario',
        surname: 'Rossi',
        birthDate: '2000-06-15',
        gender: 'NON_SPECIFICATO',
      }),
    ).rejects.toMatchObject({
      response: {
        error: 'Bad Request',
        message:
          'La password deve contenere almeno 8 caratteri, una lettera minuscola, una lettera maiuscola, un numero e un simbolo',
        statusCode: 400,
      },
    });
    expect(users).toHaveLength(0);
  });

  it('updates coach profile fields without changing personal profile fields', async () => {
    const user = await createRegisteredUser();

    const response = await service.updateProfile(
      { userId: user.id, email: user.email },
      {
        trainingGoal: 'MASSA',
        trainingLevel: 'AVANZATO',
        targetWorkoutDays: 5,
      },
    );

    expect(response.user.trainingGoal).toBe('MASSA');
    expect(response.user.trainingLevel).toBe('AVANZATO');
    expect(response.user.targetWorkoutDays).toBe(5);

    expect(response.user.name).toBe('Mario');
    expect(response.user.surname).toBe('Rossi');
    expect(response.user.gender).toBe('NON_SPECIFICATO');
  });

  it('rejects empty profile updates', async () => {
    const user = await createRegisteredUser();

    await expect(
      service.updateProfile(
        { userId: user.id, email: user.email },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sends a reset code for a registered email without storing the plain code', async () => {
    await createRegisteredUser();
    const response = await service.requestPasswordReset(' TEST@example.com ');

    expect(response).toEqual({
      message:
        'Se l’indirizzo è associato a un account, riceverai un codice via email.',
    });
    expect(sendPasswordResetCode).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(resetCodes).toHaveLength(1);
    const sentCode = sendPasswordResetCode.mock.calls[0][1];
    expect(resetCodes[0].codeHash).not.toBe(sentCode);
    expect(resetCodes[0].codeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns the same generic response for an unknown email', async () => {
    const response = await service.requestPasswordReset('missing@example.com');

    expect(response).toEqual({
      message:
        'Se l’indirizzo è associato a un account, riceverai un codice via email.',
    });
    expect(sendPasswordResetCode).not.toHaveBeenCalled();
    expect(resetCodes).toHaveLength(0);
  });

  it('rejects a wrong reset code and increments attempts', async () => {
    await createRegisteredUser();
    await requestResetAndReadCode();

    await expect(
      service.verifyPasswordResetCode('test@example.com', '000000'),
    ).rejects.toMatchObject({
      response: { message: 'Codice non valido o scaduto' },
      status: 400,
    });
    expect(resetCodes[0].attempts).toBe(1);
  });

  it('rejects an expired reset code', async () => {
    await createRegisteredUser();
    const code = await requestResetAndReadCode();
    resetCodes[0].expiresAt = new Date(Date.now() - 1000);

    await expect(
      service.verifyPasswordResetCode('test@example.com', code),
    ).rejects.toMatchObject({
      response: { message: 'Codice non valido o scaduto' },
      status: 400,
    });
  });

  it('blocks a reset code after five attempts', async () => {
    await createRegisteredUser();
    const code = await requestResetAndReadCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.verifyPasswordResetCode('test@example.com', '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
    }

    expect(resetCodes[0].attempts).toBe(5);
    await expect(
      service.verifyPasswordResetCode('test@example.com', code),
    ).rejects.toMatchObject({
      response: { message: 'Codice non valido o scaduto' },
      status: 400,
    });
  });

  it('rejects an already used reset code', async () => {
    await createRegisteredUser();
    const code = await requestResetAndReadCode();
    resetCodes[0].usedAt = new Date();

    await expect(
      service.verifyPasswordResetCode('test@example.com', code),
    ).rejects.toMatchObject({
      response: { message: 'Codice non valido o scaduto' },
      status: 400,
    });
  });

  it('updates the password and invalidates the reset code', async () => {
    const user = await createRegisteredUser();
    const oldPasswordHash = user.passwordHash;
    const code = await requestResetAndReadCode();

    await expect(
      service.resetPassword('test@example.com', code, 'NuovaPassword123!'),
    ).resolves.toEqual({ message: 'Password aggiornata con successo' });

    expect(user.passwordHash).not.toBe(oldPasswordHash);
    expect(resetCodes[0].usedAt).toBeInstanceOf(Date);
    await expect(
      service.login({
        email: 'test@example.com',
        password: 'NuovaPassword123!',
      }),
    ).resolves.toMatchObject({
      user: { email: 'test@example.com' },
    });
  });

  it('does not send another code before the 60 second cooldown', async () => {
    await createRegisteredUser();
    await requestResetAndReadCode();

    await expect(
      service.requestPasswordReset('test@example.com'),
    ).resolves.toEqual({
      message:
        'Se l’indirizzo è associato a un account, riceverai un codice via email.',
    });
    expect(sendPasswordResetCode).toHaveBeenCalledTimes(1);
    expect(resetCodes).toHaveLength(1);
  });

  it('deletes the created code when email delivery fails', async () => {
    await createRegisteredUser();
    sendPasswordResetCode.mockRejectedValueOnce(new Error('SMTP down'));

    await expect(
      service.requestPasswordReset('test@example.com'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(resetCodes).toHaveLength(0);
  });

  it('clamps target workout days between 1 and 7', async () => {
    const user = await createRegisteredUser();

    const tooHigh = await service.updateProfile(
      { userId: user.id, email: user.email },
      {
        targetWorkoutDays: 12,
      },
    );

    expect(tooHigh.user.targetWorkoutDays).toBe(7);

    const tooLow = await service.updateProfile(
      { userId: user.id, email: user.email },
      {
        targetWorkoutDays: 0,
      },
    );

    expect(tooLow.user.targetWorkoutDays).toBe(1);
  });

  it('rejects invalid coach profile values', async () => {
    const user = await createRegisteredUser();

    await expect(
      service.updateProfile(
        { userId: user.id, email: user.email },
        {
          trainingGoal: 'CARDIO',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateProfile(
        { userId: user.id, email: user.email },
        {
          trainingLevel: 'ESPERTO',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
