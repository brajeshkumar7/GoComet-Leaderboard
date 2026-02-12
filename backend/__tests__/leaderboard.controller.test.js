/**
 * Unit tests for leaderboard controller
 * Tests input validation and response shape for assignment APIs
 */

const leaderboardController = require('../src/controllers/leaderboard.controller');
const leaderboardService = require('../src/services/leaderboard.service');

jest.mock('../src/services/leaderboard.service');

describe('Leaderboard Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('POST /api/leaderboard/submit - submitScore', () => {
    it('returns 400 when user_id is missing', async () => {
      req.body = { score: 1000 };
      await leaderboardController.submitScore(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('user_id') })
      );
      expect(leaderboardService.submitScore).not.toHaveBeenCalled();
    });

    it('returns 400 when score is missing', async () => {
      req.body = { user_id: 1 };
      await leaderboardController.submitScore(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('score') })
      );
      expect(leaderboardService.submitScore).not.toHaveBeenCalled();
    });

    it('returns 400 when user_id is not a positive integer', async () => {
      req.body = { user_id: 0, score: 1000 };
      await leaderboardController.submitScore(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(leaderboardService.submitScore).not.toHaveBeenCalled();
    });

    it('returns 400 when score is negative', async () => {
      req.body = { user_id: 1, score: -1 };
      await leaderboardController.submitScore(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(leaderboardService.submitScore).not.toHaveBeenCalled();
    });

    it('returns 201 and data when input is valid', async () => {
      req.body = { user_id: 1, score: 1000 };
      leaderboardService.submitScore.mockResolvedValue({
        user_id: 1,
        score: 1000,
        total_score: 1000,
        rank: 1
      });
      await leaderboardController.submitScore(req, res, next);
      expect(leaderboardService.submitScore).toHaveBeenCalledWith(1, 1000);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ user_id: 1, score: 1000, rank: 1 })
      });
    });
  });

  describe('GET /api/leaderboard/top - getTopUsers', () => {
    it('returns 200 and array of top users', async () => {
      const mockTop = [
        { user_id: 1, username: 'user_1', total_score: 5000, rank: 1 }
      ];
      leaderboardService.getTopUsers.mockResolvedValue(mockTop);
      await leaderboardController.getTopUsers(req, res, next);
      expect(leaderboardService.getTopUsers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockTop });
    });
  });

  describe('GET /api/leaderboard/rank/:user_id - getUserRank', () => {
    it('returns 400 when user_id is invalid', async () => {
      req.params = { user_id: 'abc' };
      await leaderboardController.getUserRank(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(leaderboardService.getUserRank).not.toHaveBeenCalled();
    });

    it('returns 404 when user not found in leaderboard', async () => {
      req.params = { user_id: '999' };
      leaderboardService.getUserRank.mockResolvedValue(null);
      await leaderboardController.getUserRank(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('not found') })
      );
    });

    it('returns 200 and rank data when user exists', async () => {
      req.params = { user_id: '1' };
      const mockRank = { user_id: 1, username: 'user_1', total_score: 1000, rank: 5 };
      leaderboardService.getUserRank.mockResolvedValue(mockRank);
      await leaderboardController.getUserRank(req, res, next);
      expect(leaderboardService.getUserRank).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockRank });
    });
  });
});
