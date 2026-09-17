import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponse, AuthUser, PublicUser } from './auth.types';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 15;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 1000 * 60;
const MAX_PASSWORD_RESET_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_CODE_PATTERN = /^\d{6}$/;
const PASSWORD_RESET_REQUEST_MESSAGE =
  'Se l’indirizzo è associato a un account, riceverai un codice via email.';
const INVALID_RESET_CODE_MESSAGE = 'Codice non valido o scaduto';
const PASSWORD_REQUIREMENTS_MESSAGE =
  'La password deve contenere almeno 8 caratteri, una lettera minuscola, una lettera maiuscola, un numero e un simbolo';
const ACCOUNT_ALREADY_EXISTS_ERROR = {
  code: 'ACCOUNT_ALREADY_EXISTS',
  message: 'Account già registrato, effettua il login',
};
const DEFAULT_GENDER = 'NON_SPECIFICATO';
const ALLOWED_GENDERS = new Set(['MASCHIO', 'FEMMINA', 'NON_SPECIFICATO']);
const DEFAULT_TRAINING_GOAL = 'GENERALE';
const DEFAULT_TRAINING_LEVEL = 'PRINCIPIANTE';
const DEFAULT_TARGET_WORKOUT_DAYS = 3;

const ALLOWED_TRAINING_GOALS = new Set([
  'GENERALE',
  'MASSA',
  'FORZA',
  'DIMAGRIMENTO',
  'MANTENIMENTO',
]);

const ALLOWED_TRAINING_LEVELS = new Set([
  'PRINCIPIANTE',
  'INTERMEDIO',
  'AVANZATO',
]);

type UserRecord = {
  id: number;
  email: string;
  name: string;
  surname: string;
  birthDate: Date;
  gender: string;
  weight: number | null;
  heightCm: number | null;
  registrationDate: Date;
  trainingGoal: string;
  trainingLevel: string;
  targetWorkoutDays: number;
};

@Injectable()
export class AuthService {
  private readonly tokenSecret =
    process.env.AUTH_TOKEN_SECRET ?? 'wnote-local-dev-secret';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async register(body: {
    email?: string;
    password?: string;
    name?: string;
    surname?: string;
    birthDate?: string | Date | null;
    gender?: string | null;
  }): Promise<AuthResponse> {
    const email = this.normalizeEmail(body.email);
    const password = this.validateRegistrationPassword(body.password);
    const name = this.normalizeRequiredText(body.name, 'Nome');
    const surname = this.normalizeRequiredText(body.surname, 'Cognome');
    const birthDate = this.validateBirthDate(body.birthDate);
    const gender = this.normalizeGender(body.gender);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(ACCOUNT_ALREADY_EXISTS_ERROR);
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          surname,
          birthDate,
          gender,
          passwordHash: this.hashPassword(password),
          settings: { create: {} },
        },
      });

      return this.buildAuthResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ACCOUNT_ALREADY_EXISTS_ERROR);
      }
      throw error;
    }
  }

  async login(body: {
    email?: string;
    password?: string;
  }): Promise<AuthResponse> {
    const email = this.normalizeEmail(body.email);
    const password = this.normalizeLoginPassword(body.password);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Email o password non validi');
    }

    return this.buildAuthResponse(user);
  }

  async requestPasswordReset(
    emailInput?: string,
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(emailInput);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const latestCode = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();

    if (
      latestCode &&
      now.getTime() - latestCode.createdAt.getTime() <
        PASSWORD_RESET_RESEND_COOLDOWN_MS
    ) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const resetCode = randomInt(100000, 1000000).toString();
    const createdCode = await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: this.hashResetCode(resetCode),
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
      },
    });

    try {
      await this.mailService.sendPasswordResetCode(user.email, resetCode);
    } catch {
      await this.prisma.passwordResetCode.delete({
        where: { id: createdCode.id },
      });
      throw new ServiceUnavailableException(
        'Impossibile inviare il codice in questo momento',
      );
    }

    await this.prisma.passwordResetCode.updateMany({
      where: {
        userId: user.id,
        id: { not: createdCode.id },
        usedAt: null,
      },
      data: { usedAt: now },
    });

    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  async verifyPasswordResetCode(
    emailInput?: string,
    codeInput?: string,
  ): Promise<{ valid: true }> {
    const email = this.normalizeEmail(emailInput);
    const code = this.normalizeResetCode(codeInput);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      this.throwInvalidResetCode();
    }

    await this.assertResetCodeValid(this.prisma, user.id, code);
    return { valid: true };
  }

  async resetPassword(
    emailInput?: string,
    codeInput?: string,
    newPasswordInput?: string,
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(emailInput);
    const code = this.normalizeResetCode(codeInput);
    const newPassword = this.validateRegistrationPassword(newPasswordInput);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        this.throwInvalidResetCode();
      }

      await this.assertResetCodeValid(tx, user.id, code);
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: this.hashPassword(newPassword) },
      });
      await tx.passwordResetCode.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    return { message: 'Password aggiornata con successo' };
  }

  async updateProfile(
    authUser: AuthUser,
    body: {
      name?: string;
      surname?: string | null;
      gender?: string | null;
      height?: number | string | null;
      weight?: number | string | null;
      trainingGoal?: string | null;
      trainingLevel?: string | null;
      targetWorkoutDays?: number | string | null;
    },
  ): Promise<{ user: PublicUser }> {
    const data: {
      name?: string;
      surname?: string;
      gender?: string;
      heightCm?: number | null;
      weight?: number | null;
      trainingGoal?: string;
      trainingLevel?: string;
      targetWorkoutDays?: number;
    } = {};

    if (body.name !== undefined) {
      data.name = this.normalizeName(body.name, authUser.email);
    }

    if (body.surname !== undefined) {
      data.surname = this.normalizeRequiredText(body.surname, 'Cognome');
    }

    if (body.gender !== undefined) {
      data.gender = this.normalizeGender(body.gender);
    }

    if (body.height !== undefined) {
      data.heightCm = this.toNullableFloat(body.height);
    }

    if (body.weight !== undefined) {
      data.weight = this.toNullableFloat(body.weight);
    }

    if (body.trainingGoal !== undefined) {
      data.trainingGoal = this.normalizeTrainingGoal(body.trainingGoal);
    }

    if (body.trainingLevel !== undefined) {
      data.trainingLevel = this.normalizeTrainingLevel(body.trainingLevel);
    }

    if (body.targetWorkoutDays !== undefined) {
      data.targetWorkoutDays = this.normalizeTargetWorkoutDays(
        body.targetWorkoutDays,
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nessun campo profilo da aggiornare');
    }

    const user = await this.prisma.user.update({
      where: { id: authUser.userId },
      data,
    });

    return { user: this.toPublicUser(user) };
  }

  verifyToken(token: string | undefined): AuthUser {
    if (!token) {
      throw new UnauthorizedException('Token mancante');
    }

    const [payloadPart, signature] = token.split('.');
    if (!payloadPart || !signature) {
      throw new UnauthorizedException('Token non valido');
    }

    const expectedSignature = this.sign(payloadPart);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException('Token non valido');
    }

    let payload: AuthUser & { exp: number };
    try {
      payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as AuthUser & { exp: number };
    } catch {
      throw new UnauthorizedException('Token non valido');
    }

    if (!payload.userId || !payload.email || Date.now() > payload.exp) {
      throw new UnauthorizedException('Sessione scaduta');
    }

    return { userId: payload.userId, email: payload.email };
  }

  private buildAuthResponse(user: UserRecord): AuthResponse {
    const publicUser = this.toPublicUser(user);

    return {
      token: this.createToken({
        userId: publicUser.id,
        email: publicUser.email,
      }),
      user: publicUser,
    };
  }

  private createToken(authUser: AuthUser): string {
    const payload = Buffer.from(
      JSON.stringify({
        ...authUser,
        exp: Date.now() + TOKEN_TTL_MS,
      }),
    ).toString('base64url');

    return `${payload}.${this.sign(payload)}`;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.tokenSecret)
      .update(payload)
      .digest('base64url');
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  private verifyPassword(password: string, storedPassword: string): boolean {
    const [method, salt, hash] = storedPassword.split('$');
    if (method !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const computed = scryptSync(password, salt, 64);
    return timingSafeEqual(Buffer.from(hash, 'hex'), computed);
  }

  private hashResetCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async assertResetCodeValid(
    client: PrismaService | Prisma.TransactionClient,
    userId: number,
    code: string,
  ) {
    const resetCode = await client.passwordResetCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();

    if (
      !resetCode ||
      resetCode.expiresAt <= now ||
      resetCode.attempts >= MAX_PASSWORD_RESET_ATTEMPTS
    ) {
      this.throwInvalidResetCode();
    }

    if (!this.isMatchingHash(this.hashResetCode(code), resetCode.codeHash)) {
      await client.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { attempts: { increment: 1 } },
      });
      this.throwInvalidResetCode();
    }
  }

  private isMatchingHash(value: string, expected: string): boolean {
    const valueBuffer = Buffer.from(value, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      valueBuffer.length === expectedBuffer.length &&
      timingSafeEqual(valueBuffer, expectedBuffer)
    );
  }

  private normalizeEmail(email: string | undefined): string {
    const value = (email ?? '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      throw new BadRequestException('Email non valida');
    }
    return value;
  }

  private normalizeLoginPassword(password: string | undefined): string {
    const value = password ?? '';
    if (!value) {
      throw new BadRequestException('Password obbligatoria');
    }
    return value;
  }

  private normalizeResetCode(code: string | undefined): string {
    const value = (code ?? '').trim();
    if (!RESET_CODE_PATTERN.test(value)) {
      this.throwInvalidResetCode();
    }
    return value;
  }

  private validateRegistrationPassword(password: string | undefined): string {
    const value = this.normalizeLoginPassword(password);
    if (
      value.length < 8 ||
      !/[a-z]/.test(value) ||
      !/[A-Z]/.test(value) ||
      !/\d/.test(value) ||
      !/[^A-Za-z0-9]/.test(value)
    ) {
      throw new BadRequestException(PASSWORD_REQUIREMENTS_MESSAGE);
    }
    return value;
  }

  private normalizeName(name: string | undefined, email: string): string {
    const value = (name ?? '').trim();
    return value || email.split('@')[0] || 'Utente';
  }

  private throwInvalidResetCode(): never {
    throw new BadRequestException(INVALID_RESET_CODE_MESSAGE);
  }

  private normalizeRequiredText(
    value: string | null | undefined,
    fieldName: string,
  ): string {
    const normalized = (value ?? '').trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} obbligatorio`);
    }
    return normalized;
  }

  private toNullableText(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim();
    return normalized || null;
  }

  private toNullableFloat(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeGender(value: string | null | undefined): string {
    const normalized = (value ?? DEFAULT_GENDER)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    const aliases: Record<string, string> = {
      M: 'MASCHIO',
      MALE: 'MASCHIO',
      UOMO: 'MASCHIO',
      MASCHIO: 'MASCHIO',
      F: 'FEMMINA',
      FEMALE: 'FEMMINA',
      DONNA: 'FEMMINA',
      FEMMINA: 'FEMMINA',
      ALTRO: DEFAULT_GENDER,
      NON_SPECIFICATO: DEFAULT_GENDER,
      NON_SPECIFICATA: DEFAULT_GENDER,
      PREFERISCO_NON_SPECIFICARE: DEFAULT_GENDER,
    };

    const gender = aliases[normalized] ?? normalized;
    if (!ALLOWED_GENDERS.has(gender)) {
      throw new BadRequestException('Genere non valido');
    }
    return gender;
  }

  private normalizeTrainingGoal(value: string | null | undefined): string {
    const normalized = (value ?? DEFAULT_TRAINING_GOAL)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    if (!ALLOWED_TRAINING_GOALS.has(normalized)) {
      throw new BadRequestException('Obiettivo allenamento non valido');
    }

    return normalized;
  }

  private normalizeTrainingLevel(value: string | null | undefined): string {
    const normalized = (value ?? DEFAULT_TRAINING_LEVEL)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    if (!ALLOWED_TRAINING_LEVELS.has(normalized)) {
      throw new BadRequestException('Livello allenamento non valido');
    }

    return normalized;
  }

  private normalizeTargetWorkoutDays(
    value: number | string | null | undefined,
  ): number {
    const parsed = parseInt(String(value ?? DEFAULT_TARGET_WORKOUT_DAYS), 10);

    if (!Number.isFinite(parsed)) return DEFAULT_TARGET_WORKOUT_DAYS;

    return Math.min(Math.max(parsed, 1), 7);
  }

  private validateBirthDate(value: string | Date | null | undefined): Date {
    const birthDate = this.toNullableBirthDate(value);
    if (!birthDate) {
      throw new BadRequestException('Data di nascita obbligatoria');
    }
    return birthDate;
  }

  private toNullableBirthDate(
    value: string | Date | null | undefined,
  ): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const date =
      typeof value === 'string'
        ? this.parseBirthDateString(value)
        : new Date(
            Date.UTC(
              value.getUTCFullYear(),
              value.getUTCMonth(),
              value.getUTCDate(),
            ),
          );

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data di nascita non valida');
    }

    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    if (date > todayUtc) {
      throw new BadRequestException('Data di nascita non valida');
    }
    return date;
  }

  private parseBirthDateString(value: string): Date {
    const normalized = value.trim();
    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, yearText, monthText, dayText] = dateOnlyMatch;
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      const date = new Date(Date.UTC(year, month - 1, day));

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        return new Date(Number.NaN);
      }
      return date;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const currentMonth = today.getUTCMonth();
    const birthMonth = birthDate.getUTCMonth();
    const currentDay = today.getUTCDate();
    const birthDay = birthDate.getUTCDate();

    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      age -= 1;
    }
    return age;
  }

  private toPublicUser(user: UserRecord): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      gender: user.gender || DEFAULT_GENDER,
      age: this.calculateAge(user.birthDate),
      birthDate: user.birthDate,
      weight: user.weight,
      height: user.heightCm,
      registrationDate: user.registrationDate,
      trainingGoal: user.trainingGoal || DEFAULT_TRAINING_GOAL,
      trainingLevel: user.trainingLevel || DEFAULT_TRAINING_LEVEL,
      targetWorkoutDays: user.targetWorkoutDays || DEFAULT_TARGET_WORKOUT_DAYS,
    };
  }
}
