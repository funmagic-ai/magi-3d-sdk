/**
 * @module magi-3d/server
 * @description
 * Server-side exports for Magi 3D SDK.
 *
 * Use this module in your API routes (Next.js, Express, etc.) where you need
 * to interact with 3D generation providers directly.
 *
 * ## Usage in Next.js API Route
 * ```typescript
 * // app/api/3d/task/route.ts
 * import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d/server';
 *
 * const provider = new TripoProvider({ apiKey: process.env.TRIPO_API_KEY! });
 * const client = new Magi3DClient(provider);
 *
 * export async function POST(request: Request) {
 *   const params = await request.json();
 *   const taskId = await client.createTask(params);
 *   return Response.json({ taskId });
 * }
 *
 * export async function GET(request: Request) {
 *   const { searchParams } = new URL(request.url);
 *   const taskId = searchParams.get('id')!;
 *   const task = await client.getTask(taskId);
 *   return Response.json(task);
 * }
 * ```
 *
 * @packageDocumentation
 */

// Providers
export { TripoProvider } from '../providers/TripoProvider';
export { HunyuanProvider } from '../providers/HunyuanProvider';

// Core
export { AbstractProvider } from '../core/AbstractProvider';
export type { ImageInput } from '../core/AbstractProvider';
export { Magi3DClient } from '../core/Magi3DClient';
export type { PollOptions } from '../core/Magi3DClient';

// Utilities
export { InputUtils, InputType } from '../utils/InputUtils';

// Types
export * from '../types';
