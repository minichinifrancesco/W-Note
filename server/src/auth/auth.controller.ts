import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  register(
    @Body()
    body: {
      email?: string;
      password?: string;
      name?: string;
      surname?: string;
      birthDate?: string | Date | null;
      gender?: string | null;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('auth/login')
  login(@Body() body: { email?: string; password?: string }) {
    return this.authService.login(body);
  }

  @Post('auth/forgot-password')
  requestPasswordReset(@Body() body: { email?: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('auth/verify-reset-code')
  verifyPasswordResetCode(@Body() body: { email?: string; code?: string }) {
    return this.authService.verifyPasswordResetCode(body.email, body.code);
  }

  @Post('auth/reset-password')
  resetPassword(
    @Body()
    body: {
      email?: string;
      code?: string;
      newPassword?: string;
    },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('me/profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body()
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
  ) {
    return this.authService.updateProfile(request.user, body);
  }
}
