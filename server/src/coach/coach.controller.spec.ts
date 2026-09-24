import type { AuthenticatedRequest } from '../auth/auth.guard';
import { WeeklyCoachSummaryDto } from './dto/weeklyCoachSummary.dto';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

type CoachServiceStub = Pick<CoachService, 'getWeeklySummary'>;

describe('CoachController', () => {
  let controller: CoachController;
  let coachService: jest.Mocked<CoachServiceStub>;

  beforeEach(() => {
    coachService = {
      getWeeklySummary: jest.fn(),
    };

    controller = new CoachController(coachService as unknown as CoachService);
  });

  it('forwards the authenticated user and selected week to the service', async () => {
    const summary = {
      totals: {
        sessions: 2,
      },
    } as unknown as WeeklyCoachSummaryDto;

    const request = {
      user: {
        userId: 42,
        email: 'utente@example.com',
      },
    } as AuthenticatedRequest;

    coachService.getWeeklySummary.mockResolvedValue(summary);

    await expect(
      controller.getWeeklySummary(request, '2026-09-14'),
    ).resolves.toBe(summary);

    expect(coachService.getWeeklySummary).toHaveBeenCalledWith(
      request.user,
      '2026-09-14',
    );
  });

  it('forwards an undefined week when the query parameter is absent', async () => {
    const summary = {} as WeeklyCoachSummaryDto;

    const request = {
      user: {
        userId: 42,
        email: 'utente@example.com',
      },
    } as AuthenticatedRequest;

    coachService.getWeeklySummary.mockResolvedValue(summary);

    await expect(controller.getWeeklySummary(request)).resolves.toBe(summary);

    expect(coachService.getWeeklySummary).toHaveBeenCalledWith(
      request.user,
      undefined,
    );
  });
});
