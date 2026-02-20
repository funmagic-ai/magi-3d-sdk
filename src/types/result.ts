/**
 * @module types/result
 * @description Task result and artifact type definitions
 */

import { TaskStatus, TaskType, ProviderId, RemoteUrl } from './enums';

/**
 * Standard output artifacts from a 3D generation or post-processing task.
 *
 * @remarks
 * The `model` field is always the primary output URL, regardless of task type or format.
 * Use this for simple access to the main result.
 *
 * Format-specific fields (modelGlb, modelFbx, etc.) are populated when:
 * - The provider returns explicit format information (e.g., Hunyuan)
 * - Multiple formats are available from the same task
 *
 * @example
 * ```typescript
 * // Simple - always use model for primary output
 * const url = result.result?.model;
 *
 * // Format-specific when needed
 * const glb = result.result?.modelGlb;
 * const fbx = result.result?.modelFbx;
 * ```
 */
export interface TaskArtifacts {
  /** Primary model URL - always the main output regardless of format or task type */
  model: RemoteUrl;

  /** GLB model URL (when format is known) */
  modelGlb?: RemoteUrl;
  /** PBR model URL (with PBR materials, available when pbr=true) */
  modelPbr?: RemoteUrl;
  /** Base model URL (geometry without texture, available when texture=false) */
  modelBase?: RemoteUrl;

  /** USDZ model URL (for iOS/AR) */
  modelUsdz?: RemoteUrl;
  /** FBX model URL */
  modelFbx?: RemoteUrl;
  /** OBJ model URL */
  modelObj?: RemoteUrl;

  /** Thumbnail preview image URL */
  thumbnail?: RemoteUrl;
  /** 360-degree rotation video URL */
  video?: RemoteUrl;
  /** Generated image URL (for text_to_image, generate_image tasks) */
  generatedImage?: RemoteUrl;
  /** Whether the model can be rigged (for pre_rig_check tasks) */
  riggable?: boolean;
  /** Detected rig type (for pre_rig_check tasks) */
  rigType?: string;
  /** Texture maps (if returned separately by provider) */
  textureMaps?: {
    albedo?: RemoteUrl;
    normal?: RemoteUrl;
    roughness?: RemoteUrl;
  };
}

/**
 * Standardized task object representing a 3D generation or post-processing task
 */
export interface StandardTask {
  /** Unique task identifier */
  id: string;
  /** Provider that processed this task */
  provider: ProviderId;
  /** Type of task */
  type: TaskType;

  /** Current status */
  status: TaskStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Progress detail message (e.g., "Meshing...") */
  progressDetail?: string;

  /** Output artifacts (present on success) */
  result?: TaskArtifacts;
  /** Error details (present on failure) */
  error?: {
    code: string;
    message: string;
    raw?: unknown;
  };

  /** Task creation timestamp (milliseconds) */
  createdAt: number;
  /** Task completion timestamp (milliseconds) */
  finishedAt?: number;

  /**
   * Raw response from the provider API.
   * Useful for debugging or storing provider-specific data.
   * Developer can decide whether to persist this.
   */
  rawResponse?: unknown;
}
