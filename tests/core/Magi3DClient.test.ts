// tests/core/Magi3DClient.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Magi3DClient } from '../../src/core/Magi3DClient';
import { AbstractProvider } from '../../src/core/AbstractProvider';
import { StandardTask, TaskStatus, TaskType, ProviderId, TaskParams } from '../../src/types';

// Mock provider for testing
class MockProvider extends AbstractProvider {
  readonly name = 'Mock';

  constructor(config: any) {
    super(config);
    // Register supported task types for testing
    this.supportedTaskTypes.add(TaskType.IMAGE_TO_3D);
    this.supportedTaskTypes.add(TaskType.TEXT_TO_3D);
    this.supportedTaskTypes.add(TaskType.CONVERT);
    this.supportedTaskTypes.add(TaskType.RIG);
  }

  protected async prepareInput(input: any) {
    return input;
  }

  protected async doCreateTask(params: TaskParams) {
    return 'task-123';
  }

  async getTaskStatus(taskId: string): Promise<StandardTask> {
    return {
      id: taskId,
      provider: ProviderId.TRIPO,
      type: TaskType.IMAGE_TO_3D,
      status: TaskStatus.SUCCEEDED,
      progress: 100,
      result: {
        modelGlb: 'https://example.com/model.glb',
        thumbnail: 'https://example.com/thumb.png'
      },
      createdAt: Date.now()
    };
  }
}

describe('Magi3DClient', () => {
  let provider: MockProvider;
  let client: Magi3DClient;

  beforeEach(() => {
    provider = new MockProvider({ apiKey: 'test' });
    client = new Magi3DClient(provider);
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: 'https://example.com/image.jpg'
      });

      expect(taskId).toBe('task-123');
    });

    it('should create a text-to-3D task', async () => {
      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a cute cat'
      });

      expect(taskId).toBe('task-123');
    });

    it('should create a post-processing task', async () => {
      const taskId = await client.createTask({
        type: TaskType.CONVERT,
        taskId: 'original-task',
        format: 'fbx'
      });

      expect(taskId).toBe('task-123');
    });
  });

  describe('getTask', () => {
    it('should get task status', async () => {
      const task = await client.getTask('task-123');

      expect(task.id).toBe('task-123');
      expect(task.status).toBe(TaskStatus.SUCCEEDED);
      expect(task.result?.modelGlb).toBeDefined();
    });
  });

  describe('pollUntilDone', () => {
    it('should poll until task succeeds', async () => {
      const result = await client.pollUntilDone('task-123', {
        interval: 100,
        timeout: 5000
      });

      expect(result.status).toBe(TaskStatus.SUCCEEDED);
      expect(result.result?.modelGlb).toBeDefined();
    });

    it('should call onProgress callback', async () => {
      const onProgress = vi.fn();

      await client.pollUntilDone('task-123', {
        interval: 100,
        timeout: 5000,
        onProgress
      });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-123',
          status: TaskStatus.SUCCEEDED
        })
      );
    });

    it('should emit progress events', async () => {
      const progressHandler = vi.fn();
      client.on('progress', progressHandler);

      await client.pollUntilDone('task-123', {
        interval: 100,
        timeout: 5000
      });

      expect(progressHandler).toHaveBeenCalled();
    });

    it('should timeout if task takes too long', async () => {
      // Override getTaskStatus to return PROCESSING
      vi.spyOn(provider, 'getTaskStatus').mockResolvedValue({
        id: 'task-456',
        provider: ProviderId.TRIPO,
        type: TaskType.IMAGE_TO_3D,
        status: TaskStatus.PROCESSING,
        progress: 50,
        createdAt: Date.now()
      });

      await expect(
        client.pollUntilDone('task-456', {
          interval: 100,
          timeout: 500
        })
      ).rejects.toThrow('timed out');
    });
  });
});
