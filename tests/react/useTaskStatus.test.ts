/**
 * Unit tests for useTaskStatus hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskStatus } from '../../src/react/useTaskStatus';
import { TaskStatus, TaskType, ProviderId } from '../../src/types';
import type { StandardTask } from '../../src/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock task responses
function createMockTask(overrides: Partial<StandardTask> = {}): StandardTask {
  return {
    id: 'existing-task-id',
    provider: ProviderId.TRIPO,
    type: TaskType.TEXT_TO_3D,
    status: TaskStatus.PROCESSING,
    progress: 50,
    createdAt: Date.now(),
    ...overrides
  };
}

// Helper to create successful fetch response
function mockFetchSuccess(task: StandardTask) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(task)
  });
}

describe('useTaskStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO })
      );

      expect(result.current.task).toBeNull();
      expect(result.current.isPolling).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.startPolling).toBe('function');
      expect(typeof result.current.stopPolling).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('startPolling', () => {
    it('should start polling an existing task', async () => {
      const task = createMockTask({ progress: 60 });
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO })
      );

      act(() => {
        result.current.startPolling('existing-task-id');
      });

      expect(result.current.isPolling).toBe(true);

      await waitFor(() => {
        expect(result.current.task).not.toBeNull();
      });

      expect(result.current.task?.id).toBe('existing-task-id');
      expect(result.current.progress).toBe(60);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task/existing-task-id?providerId=tripo',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should call onComplete when task succeeds', async () => {
      const successTask = createMockTask({
        status: TaskStatus.SUCCEEDED,
        progress: 100,
        result: { model: 'https://example.com/model.glb', modelGlb: 'https://example.com/model.glb' }
      });
      mockFetchSuccess(successTask);

      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO, onComplete })
      );

      act(() => {
        result.current.startPolling('existing-task-id');
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.SUCCEEDED,
        result: expect.objectContaining({
          model: 'https://example.com/model.glb'
        })
      }));
    });

    it('should call onError when task fails', async () => {
      const failedTask = createMockTask({
        status: TaskStatus.FAILED,
        error: { code: 'GENERATION_FAILED', message: 'Model generation failed', raw: {} }
      });
      mockFetchSuccess(failedTask);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO, onError })
      );

      act(() => {
        result.current.startPolling('existing-task-id');
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error?.message).toBe('Model generation failed');
    });

    it('should call onProgress on each poll', async () => {
      const task1 = createMockTask({ progress: 25 });
      const task2 = createMockTask({ progress: 50 });
      const task3 = createMockTask({ status: TaskStatus.SUCCEEDED, progress: 100 });

      mockFetchSuccess(task1);
      mockFetchSuccess(task2);
      mockFetchSuccess(task3);

      const onProgress = vi.fn();
      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO, pollingInterval: 1000, onProgress })
      );

      act(() => {
        result.current.startPolling('existing-task-id');
      });

      // First poll
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 25 }));
      });

      // Second poll
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 50 }));
      });

      // Third poll
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 100 }));
      });
    });
  });

  describe('stopPolling', () => {
    it('should stop polling without clearing state', async () => {
      const task = createMockTask({ progress: 45 });
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO, pollingInterval: 1000 })
      );

      act(() => {
        result.current.startPolling('existing-task-id');
      });

      await waitFor(() => {
        expect(result.current.task).not.toBeNull();
      });

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.task).not.toBeNull();
      expect(result.current.progress).toBe(45);
    });
  });

  describe('refresh', () => {
    it('should manually refresh task status', async () => {
      const task1 = createMockTask({ progress: 30 });
      const task2 = createMockTask({ progress: 70 });

      mockFetchSuccess(task1);
      mockFetchSuccess(task2);

      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO })
      );

      // Start polling and stop to set taskId
      act(() => {
        result.current.startPolling('existing-task-id');
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(30);
      });

      act(() => {
        result.current.stopPolling();
      });

      // Manually refresh
      let refreshedTask: StandardTask | null = null;
      await act(async () => {
        refreshedTask = await result.current.refresh();
      });

      expect(refreshedTask?.progress).toBe(70);
      expect(result.current.progress).toBe(70);
      expect(result.current.isPolling).toBe(false); // Should not start polling
    });
  });

  describe('default api endpoint', () => {
    it('should use /api/3d as default', async () => {
      const task = createMockTask();
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        useTaskStatus({ providerId: ProviderId.TRIPO }) // Only providerId required
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/3d/task/test-task-id?providerId=tripo',
          expect.any(Object)
        );
      });
    });
  });

  describe('cancelled task', () => {
    it('should handle cancelled task status', async () => {
      const cancelledTask = createMockTask({
        status: TaskStatus.CANCELED
      });
      mockFetchSuccess(cancelledTask);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO, onError })
      );

      act(() => {
        result.current.startPolling('cancelled-task-id');
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.task?.status).toBe(TaskStatus.CANCELED);
    });
  });

  describe('polling with custom options', () => {
    it('should respect custom pollingInterval', async () => {
      const task1 = createMockTask({ progress: 20 });
      const task2 = createMockTask({ status: TaskStatus.SUCCEEDED, progress: 100 });

      mockFetchSuccess(task1);
      mockFetchSuccess(task2);

      const { result } = renderHook(() =>
        useTaskStatus({ api: '/api/3d', providerId: ProviderId.TRIPO, pollingInterval: 5000 })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(20);
      });

      // Advance less than polling interval - should not poll yet
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance past polling interval - should poll again
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should respect custom headers', async () => {
      const task = createMockTask();
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        useTaskStatus({
          api: '/api/3d',
          providerId: ProviderId.TRIPO,
          headers: { 'Authorization': 'Bearer my-token' }
        })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer my-token'
            })
          })
        );
      });
    });
  });
});
