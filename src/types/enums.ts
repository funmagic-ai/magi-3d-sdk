/**
 * @module types/enums
 * @description Core enumeration types for the SDK
 */

/**
 * Unique identifiers for supported 3D generation providers.
 */
export enum ProviderId {
  TRIPO = 'tripo',
  HUNYUAN = 'hunyuan'
}

/**
 * Possible states of a task.
 *
 * @remarks
 * Terminal states: `SUCCEEDED`, `FAILED`, `TIMEOUT`, `CANCELED`
 * In-progress states: `PENDING`, `PROCESSING`
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  CANCELED = 'CANCELED'
}

/**
 * Unified task types for all 3D operations.
 *
 * @remarks
 * This enum covers both primary generation and post-processing operations.
 * All operations use the same `createTask()` API - the `type` field determines
 * what operation is performed.
 *
 * **Primary Generation:**
 * - `TEXT_TO_3D` - Generate 3D model from text prompt
 * - `IMAGE_TO_3D` - Generate 3D model from single image
 * - `MULTIVIEW_TO_3D` - Generate 3D model from multiple view images
 *
 * **Texture & Refinement:**
 * - `TEXTURE` - Re-texture or enhance model textures
 * - `REFINE` - Improve model quality
 *
 * **Animation & Rigging:**
 * - `RIG` - Add skeletal rigging to model
 * - `ANIMATE` - Apply animation to rigged model
 *
 * **Mesh Operations:**
 * - `SEGMENT` - Segment model into parts (same as part generation)
 * - `DECIMATE` - Reduce polygon count (lowpoly)
 * - `UV_UNWRAP` - UV unwrapping for textures
 *
 * **Utility:**
 * - `CONVERT` - Format conversion (GLB, FBX, OBJ, USDZ, etc.)
 * - `IMPORT` - Import external model for post-processing
 */
export enum TaskType {
  // Primary generation
  TEXT_TO_3D = 'text_to_model',
  IMAGE_TO_3D = 'image_to_model',
  MULTIVIEW_TO_3D = 'multiview_to_model',

  // Texture & refinement
  TEXTURE = 'texture_model',
  REFINE = 'refine_model',

  // Animation & rigging
  RIG = 'animate_rig',
  ANIMATE = 'animate_retarget',

  // Mesh operations
  SEGMENT = 'mesh_segmentation',
  DECIMATE = 'highpoly_to_lowpoly',
  UV_UNWRAP = 'uv_unwrap',

  // Utility
  CONVERT = 'convert_model',
  IMPORT = 'import_model'
}

/** Type alias for URL strings */
export type RemoteUrl = string;
