/**
 * Unit tests for usePolling hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolling } from '../../src/react/usePolling';
import { TaskStatus, ProviderId, TaskType } from '../../src/types';
import type { StandardTask } from '../../src/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock task responses
function createMockTask(overrides: Partial<StandardTask> = {}): StandardTask {
  return {
    id: 'test-task-id',
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

// Helper to create failed fetch response
function mockFetchError(status: number, statusText: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText
  });
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });

  afterEach(() => {
    // Only run pending timers if fake timers are active
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d' })
      );

      expect(result.current.task).toBeNull();
      expect(result.current.taskId).toBeNull();
      expect(result.current.isPolling).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('startPolling', () => {
    it('should start polling and update task state', async () => {
      const processingTask = createMockTask({ status: TaskStatus.PROCESSING, progress: 30 });
      mockFetchSuccess(processingTask);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', pollingInterval: 1000 })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      expect(result.current.isPolling).toBe(true);
      expect(result.current.taskId).toBe('test-task-id');

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.task).not.toBeNull();
      });

      expect(result.current.task?.status).toBe(TaskStatus.PROCESSING);
      expect(result.current.progress).toBe(30);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task/test-task-id',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should call onProgress callback on each poll', async () => {
      const onProgress = vi.fn();
      const task = createMockTask({ progress: 50 });
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', onProgress })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 50 }));
      });
    });

    it('should stop polling and call onSuccess when task succeeds', async () => {
      const onSuccess = vi.fn();
      const successTask = createMockTask({
        status: TaskStatus.SUCCEEDED,
        progress: 100,
        result: { modelGlb: 'https://example.com/model.glb' }
      });
      mockFetchSuccess(successTask);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', onSuccess })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.SUCCEEDED
      }));
      expect(result.current.task?.result?.modelGlb).toBe('https://example.com/model.glb');
    });

    it('should stop polling and call onError when task fails', async () => {
      const onError = vi.fn();
      const failedTask = createMockTask({
        status: TaskStatus.FAILED,
        error: { code: 'GENERATION_FAILED', message: 'Model generation failed', raw: {} }
      });
      mockFetchSuccess(failedTask);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', onError })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error?.message).toBe('Model generation failed');
    });

    it('should continue polling for non-terminal statuses', async () => {
      const task1 = createMockTask({ status: TaskStatus.PROCESSING, progress: 30 });
      const task2 = createMockTask({ status: TaskStatus.PROCESSING, progress: 60 });
      const task3 = createMockTask({ status: TaskStatus.SUCCEEDED, progress: 100 });

      mockFetchSuccess(task1);
      mockFetchSuccess(task2);
      mockFetchSuccess(task3);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', pollingInterval: 1000 })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      // First poll
      await waitFor(() => {
        expect(result.current.progress).toBe(30);
      });

      // Advance timer for second poll
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(60);
      });

      // Advance timer for third poll
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(100);
        expect(result.current.isPolling).toBe(false);
      });
    });
  });

  describe('stopPolling', () => {
    it('should stop polling without resetting state', async () => {
      const task = createMockTask({ progress: 50 });
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', pollingInterval: 1000 })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(result.current.task).not.toBeNull();
      });

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.task).not.toBeNull(); // State preserved
      expect(result.current.taskId).toBe('test-task-id'); // TaskId preserved
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      const task = createMockTask({ progress: 50 });
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d' })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(result.current.task).not.toBeNull();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.task).toBeNull();
      expect(result.current.taskId).toBeNull();
      expect(result.current.isPolling).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should manually fetch task status without starting polling', async () => {
      const task = createMockTask({ progress: 75 });
      mockFetchSuccess(task);
      mockFetchSuccess(createMockTask({ progress: 80 }));

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d' })
      );

      // Start and stop polling to set taskId
      act(() => {
        result.current.startPolling('test-task-id');
      });

      await waitFor(() => {
        expect(result.current.task).not.toBeNull();
      });

      act(() => {
        result.current.stopPolling();
      });

      // Now refresh
      let refreshedTask: StandardTask | null = null;
      await act(async () => {
        refreshedTask = await result.current.refresh();
      });

      expect(refreshedTask?.progress).toBe(80);
      expect(result.current.progress).toBe(80);
      expect(result.current.isPolling).toBe(false); // Not polling
    });

    it('should return null if no taskId is set', async () => {
      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d' })
      );

      let refreshedTask: StandardTask | null = null;
      await act(async () => {
        refreshedTask = await result.current.refresh();
      });

      expect(refreshedTask).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors with exponential backoff', async () => {
      mockFetchError(500, 'Internal Server Error');
      mockFetchError(500, 'Internal Server Error');
      const successTask = createMockTask({ status: TaskStatus.SUCCEEDED });
      mockFetchSuccess(successTask);

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', pollingInterval: 1000, maxRetries: 5 })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      // First error
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance past backoff (1000 * 1.5 = 1500)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      // Second error
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Advance past backoff (1500 * 1.5 = 2250)
      await act(async () => {
        vi.advanceTimersByTime(2250);
      });

      // Third attempt succeeds
      await waitFor(() => {
        expect(result.current.task?.status).toBe(TaskStatus.SUCCEEDED);
      });
    });

    it('should stop and call onError after max retries exceeded', async () => {
      const onError = vi.fn();

      // Mock 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        mockFetchError(500, 'Internal Server Error');
      }

      const { result } = renderHook(() =>
        usePolling({ api: '/api/3d', pollingInterval: 100, maxRetries: 5, onError })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      // Process all retries with backoff
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          vi.advanceTimersByTime(15000); // Max backoff is 15000ms
        });
      }

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error?.message).toContain('5 consecutive errors');
    });

    it('should timeout after specified duration', async () => {
      const onError = vi.fn();
      const task = createMockTask({ status: TaskStatus.PROCESSING });

      // Keep returning processing status
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(task)
        })
      );

      // Use real timers for this test since timeout relies on Date.now()
      vi.useRealTimers();

      const { result } = renderHook(() =>
        usePolling({
          api: '/api/3d',
          pollingInterval: 50, // Short interval
          timeout: 200, // Short timeout
          onError
        })
      );

      act(() => {
        result.current.startPolling('test-task-id');
      });

      // Wait for timeout to occur
      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      }, { timeout: 1000 });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error?.message).toContain('timed out');
    });
  });

  describe('custom headers', () => {
    it('should include custom headers in requests', async () => {
      const task = createMockTask();
      mockFetchSuccess(task);

      const { result } = renderHook(() =>
        usePolling({
          api: '/api/3d',
          headers: { 'Authorization': 'Bearer test-token' }
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
              'Authorization': 'Bearer test-token'
            })
          })
        );
      });
    });
  });
});
