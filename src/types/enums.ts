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
 * **Image Generation:**
 * - `TEXT_TO_IMAGE` - Generate image from text prompt
 * - `GENERATE_IMAGE` - Advanced image generation with image/text input
 *
 * **Texture & Refinement:**
 * - `TEXTURE` - Re-texture or enhance model textures
 * - `REFINE` - Improve model quality
 *
 * **Animation & Rigging:**
 * - `PRE_RIG_CHECK` - Check if model can be rigged
 * - `RIG` - Add skeletal rigging to model
 * - `ANIMATE` - Apply animation to rigged model
 *
 * **Mesh Operations:**
 * - `SEGMENT` - Segment model into parts
 * - `MESH_COMPLETION` - Complete/fill mesh parts after segmentation
 * - `DECIMATE` - Reduce polygon count (lowpoly)
 * - `UV_UNWRAP` - UV unwrapping for textures
 *
 * **Avatar:**
 * - `PROFILE_TO_3D` - Generate 3D character from face photo + template (Hunyuan only)
 *
 * **Utility:**
 * - `CONVERT` - Format conversion (GLB, FBX, OBJ, USDZ, etc.)
 * - `IMPORT` - Import external model for post-processing
 * - `STYLIZE` - Apply artistic style (lego, voxel, voronoi, minecraft)
 */
export enum TaskType {
  // Primary generation
  TEXT_TO_3D = 'text_to_model',
  IMAGE_TO_3D = 'image_to_model',
  MULTIVIEW_TO_3D = 'multiview_to_model',

  // Image generation
  TEXT_TO_IMAGE = 'text_to_image',
  GENERATE_IMAGE = 'generate_image',

  // Texture & refinement
  TEXTURE = 'texture_model',
  REFINE = 'refine_model',

  // Animation & rigging
  PRE_RIG_CHECK = 'animate_prerigcheck',
  RIG = 'animate_rig',
  ANIMATE = 'animate_retarget',

  // Mesh operations
  SEGMENT = 'mesh_segmentation',
  MESH_COMPLETION = 'mesh_completion',
  DECIMATE = 'highpoly_to_lowpoly',
  UV_UNWRAP = 'uv_unwrap',

  // Avatar
  PROFILE_TO_3D = 'profile_to_3d',

  // Utility
  CONVERT = 'convert_model',
  IMPORT = 'import_model',
  STYLIZE = 'stylize_model'
}

/** Type alias for URL strings */
export type RemoteUrl = string;
