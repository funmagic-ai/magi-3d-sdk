// Main entry point for Magi 3D SDK
//
// For targeted imports, use:
//   - 'magi-3d/server' for API route handlers
//   - 'magi-3d/react' for React hooks

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
