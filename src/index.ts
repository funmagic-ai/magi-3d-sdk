/**
 * Magi 3D SDK - A universal TypeScript SDK for 3D generative AI providers.
 *
 * @module magi-3d
 *
 * ## Installation
 * ```bash
 * pnpm add magi-3d
 * ```
 *
 * ## Quick Start
 * ```typescript
 * import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d';
 *
 * const provider = new TripoProvider({ apiKey: 'your-api-key' });
 * const client = new Magi3DClient(provider);
 *
 * const taskId = await client.createTask({
 *   type: TaskType.TEXT_TO_3D,
 *   prompt: 'a cute cat'
 * });
 *
 * const result = await client.pollUntilDone(taskId);
 * console.log('Model URL:', result.result?.modelGlb);
 * ```
 *
 * ## Targeted Imports
 * - `magi-3d/server` - For API route handlers (Node.js)
 * - `magi-3d/react` - For React hooks (frontend)
 *
 * @packageDocumentation
 */

// Providers
export { TripoProvider } from './providers/TripoProvider';
export { HunyuanProvider } from './providers/HunyuanProvider';

// Core
export { AbstractProvider } from './core/AbstractProvider';
export type { ImageInput } from './core/AbstractProvider';
export { Magi3DClient } from './core/Magi3DClient';
export type { PollOptions } from './core/Magi3DClient';

// Utilities
export { InputUtils, InputType } from './utils/InputUtils';

// Types
export * from './types';
