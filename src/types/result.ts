/**
 * @module types/result
 * @description Task result and artifact type definitions
 */

import { TaskStatus, TaskType, ProviderId, RemoteUrl } from './enums';

/**
 * Standard output artifacts from a 3D generation task
 */
export interface TaskArtifacts {
  /** Primary GLB model URL (best available: pbr > standard > base) */
  modelGlb: RemoteUrl;

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
}
