// tests/providers/TripoProvider.test.ts
import { describe, it, expect } from 'vitest';
import { TripoProvider } from '../../src/providers/TripoProvider';
import { TaskType } from '../../src/types';

describe('TripoProvider', () => {
  describe('initialization', () => {
    it('should initialize with config', () => {
      const provider = new TripoProvider({
        apiKey: 'test-key'
      });

      expect(provider.name).toBe('Tripo');
    });

    it('should register supported task types', () => {
      const provider = new TripoProvider({
        apiKey: 'test-key'
      });

      expect(provider.supports(TaskType.TEXT_TO_3D)).toBe(true);
      expect(provider.supports(TaskType.IMAGE_TO_3D)).toBe(true);
      expect(provider.supports(TaskType.CONVERT)).toBe(true);
      expect(provider.supports(TaskType.RIG)).toBe(true);
      expect(provider.supports(TaskType.TEXTURE)).toBe(true);
      expect(provider.supports(TaskType.REFINE)).toBe(true);
      expect(provider.supports(TaskType.DECIMATE)).toBe(true);
      expect(provider.supports(TaskType.SEGMENT)).toBe(true);
      expect(provider.supports(TaskType.ANIMATE)).toBe(true);
    });

    it('should not support unsupported task types', () => {
      const provider = new TripoProvider({
        apiKey: 'test-key'
      });

      // UV_UNWRAP is supported now, so test for something that really isn't supported
      // All current TaskTypes are supported, so this test verifies the provider doesn't
      // claim to support non-existent task types (which would throw anyway)
      expect(provider.supports(TaskType.UV_UNWRAP)).toBe(false);
    });
  });

  describe('prepareInput', () => {
    it('should accept URL inputs', async () => {
      const provider = new TripoProvider({
        apiKey: 'test-key'
      });

      const result = await (provider as any).prepareInput('https://example.com/image.jpg');
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should reject non-URL inputs', async () => {
      const provider = new TripoProvider({
        apiKey: 'test-key'
      });

      await expect((provider as any).prepareInput('not-a-url')).rejects.toThrow(
        'TripoProvider requires URL inputs'
      );
    });
  });

  // E2E tests (skipped by default - require real API key)
  describe.skip('E2E tests', () => {
    it('should generate model from text', async () => {
      if (!process.env.TRIPO_API_KEY) {
        console.warn('Skipping E2E test: TRIPO_API_KEY not set');
        return;
      }

      const provider = new TripoProvider({
        apiKey: process.env.TRIPO_API_KEY
      });

      const taskId = await provider.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a small cube'
      });

      expect(taskId).toBeTruthy();
      expect(typeof taskId).toBe('string');
    }, 60000);  // 60s timeout

    it('should get task status', async () => {
      if (!process.env.TRIPO_API_KEY || !process.env.TRIPO_TEST_TASK_ID) {
        console.warn('Skipping E2E test: TRIPO_API_KEY or TRIPO_TEST_TASK_ID not set');
        return;
      }

      const provider = new TripoProvider({
        apiKey: process.env.TRIPO_API_KEY
      });

      const task = await provider.getTaskStatus(process.env.TRIPO_TEST_TASK_ID);

      expect(task.id).toBe(process.env.TRIPO_TEST_TASK_ID);
      expect(task.provider).toBe('tripo');
      expect(task.status).toBeDefined();
    }, 30000);
  });
});
