/**
 * @module types
 * @description Type definitions for the Magi 3D SDK
 */

// Central barrel export for all type definitions

// Core enums
export { ProviderId, TaskStatus, TaskType } from './enums';
export type { RemoteUrl } from './enums';

// Parameter types
export type {
  TaskParams,
  TextTo3DParams,
  ImageTo3DParams,
  MultiviewTo3DParams,
  TextureParams,
  RefineParams,
  RigParams,
  AnimateParams,
  SegmentParams,
  DecimateParams,
  UVUnwrapParams,
  ConvertParams,
  ImportParams,
  TripoOptions,
  HunyuanOptions
} from './params';

// Type guards
export {
  isPrimaryGenerationTask,
  isPostProcessTask,
  requiresTaskId,
  isTextTo3DParams,
  isImageTo3DParams,
  isMultiviewTo3DParams,
  isTextureParams,
  isRefineParams,
  isRigParams,
  isAnimateParams,
  isSegmentParams,
  isDecimateParams,
  isUVUnwrapParams,
  isConvertParams,
  isImportParams
} from './params';

// Result types
export type {
  StandardTask,
  TaskArtifacts
} from './result';

// Configuration types
export type {
  ProviderConfig,
  TripoConfig,
  HunyuanConfig,
} from './config';
