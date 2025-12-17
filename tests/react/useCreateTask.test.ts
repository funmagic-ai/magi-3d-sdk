/**
 * Unit tests for useCreateTask hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCreateTask } from '../../src/react/useCreateTask';
import { TaskStatus, TaskType, ProviderId } from '../../src/types';
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

describe('useCreateTask', () => {
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
        useCreateTask({ api: '/api/3d' })
      );

      expect(result.current.task).toBeNull();
      expect(result.current.taskId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createTask).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.stop).toBe('function');
    });
  });

  describe('createTask', () => {
    it('should create a task and start polling', async () => {
      // Mock POST /api/3d/task - create task
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'new-task-id' })
      });

      // Mock GET /api/3d/task/new-task-id - poll status (processing)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({
          id: 'new-task-id',
          status: TaskStatus.PROCESSING,
          progress: 30
        }))
      });

      // Mock GET - poll status (succeeded)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({
          id: 'new-task-id',
          status: TaskStatus.SUCCEEDED,
          progress: 100,
          result: { modelGlb: 'https://example.com/model.glb' }
        }))
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d', pollingInterval: 1000, onSuccess })
      );

      // Create task
      let taskId: string | undefined;
      await act(async () => {
        taskId = await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'a cute cat'
        });
      });

      expect(taskId).toBe('new-task-id');
      expect(result.current.taskId).toBe('new-task-id');
      expect(result.current.isLoading).toBe(true);

      // Verify POST was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            type: TaskType.TEXT_TO_3D,
            prompt: 'a cute cat'
          })
        })
      );

      // Wait for first poll
      await waitFor(() => {
        expect(result.current.progress).toBe(30);
      });

      // Advance timer for second poll
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Wait for success
      await waitFor(() => {
        expect(result.current.task?.status).toBe(TaskStatus.SUCCEEDED);
        expect(result.current.isLoading).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.task?.result?.modelGlb).toBe('https://example.com/model.glb');
    });

    it('should handle task creation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ message: 'Invalid prompt' })
      });

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d', onError })
      );

      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.createTask({
            type: TaskType.TEXT_TO_3D,
            prompt: ''
          });
        } catch (err) {
          caughtError = err as Error;
        }
      });

      expect(caughtError?.message).toBe('Invalid prompt');
      expect(onError).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle missing taskId in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}) // No taskId
      });

      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d' })
      );

      await expect(
        act(async () => {
          await result.current.createTask({
            type: TaskType.TEXT_TO_3D,
            prompt: 'test'
          });
        })
      ).rejects.toThrow('No taskId returned from server');
    });

    it('should support all task types', async () => {
      // Test IMAGE_TO_3D
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'image-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ status: TaskStatus.SUCCEEDED }))
      });

      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d' })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.IMAGE_TO_3D,
          input: 'https://example.com/image.jpg'
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task',
        expect.objectContaining({
          body: JSON.stringify({
            type: TaskType.IMAGE_TO_3D,
            input: 'https://example.com/image.jpg'
          })
        })
      );
    });

    it('should include providerOptions in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'task-with-options' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ status: TaskStatus.SUCCEEDED }))
      });

      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d' })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'a robot',
          providerOptions: {
            pbr: true,
            texture_quality: 'detailed'
          }
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task',
        expect.objectContaining({
          body: JSON.stringify({
            type: TaskType.TEXT_TO_3D,
            prompt: 'a robot',
            providerOptions: {
              pbr: true,
              texture_quality: 'detailed'
            }
          })
        })
      );
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'test-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ progress: 50 }))
      });

      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d' })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'test'
        });
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(50);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.task).toBeNull();
      expect(result.current.taskId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('stop', () => {
    it('should stop polling without resetting task data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'test-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ progress: 50 }))
      });

      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d' })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'test'
        });
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(50);
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.task).not.toBeNull(); // Task data preserved
      expect(result.current.taskId).toBe('test-task'); // TaskId preserved
    });
  });

  describe('callbacks', () => {
    it('should call onProgress during polling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'test-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ progress: 25 }))
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ progress: 75 }))
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ status: TaskStatus.SUCCEEDED, progress: 100 }))
      });

      const onProgress = vi.fn();
      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d', pollingInterval: 1000, onProgress })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'test'
        });
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
        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ progress: 75 }));
      });
    });

    it('should call onError when task fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'test-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({
          status: TaskStatus.FAILED,
          error: { code: 'CONTENT_POLICY_VIOLATION', message: 'Content blocked', raw: {} }
        }))
      });

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useCreateTask({ api: '/api/3d', onError })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'test'
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error?.message).toBe('Content blocked');
    });
  });

  describe('custom headers', () => {
    it('should include custom headers in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'test-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ status: TaskStatus.SUCCEEDED }))
      });

      const { result } = renderHook(() =>
        useCreateTask({
          api: '/api/3d',
          headers: { 'X-Custom-Header': 'custom-value' }
        })
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'test'
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });
  });

  describe('default api endpoint', () => {
    it('should use /api/3d as default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ taskId: 'test-task' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockTask({ status: TaskStatus.SUCCEEDED }))
      });

      const { result } = renderHook(() =>
        useCreateTask() // No api option
      );

      await act(async () => {
        await result.current.createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'test'
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/3d/task',
        expect.any(Object)
      );
    });
  });
});
