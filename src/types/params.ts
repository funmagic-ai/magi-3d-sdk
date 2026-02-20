/**
 * @module types/params
 * @description Unified task parameter types for all 3D operations
 */

import { TaskType, RemoteUrl } from './enums';

// ============================================
// Provider-specific options
// ============================================

/**
 * Tripo-specific generation options
 * @see https://platform.tripo3d.ai/docs
 */
export interface TripoOptions {
  /** Model version (varies by task type, see API docs for valid values) */
  model_version?: string;

  // --- Texture options ---
  /** Enable PBR materials (default: true) */
  pbr?: boolean;
  /** Enable texturing (default: true) */
  texture?: boolean;
  /** Texture resolution: "standard" or "detailed" */
  texture_quality?: 'standard' | 'detailed';
  /** Texture alignment strategy */
  texture_alignment?: 'original_image' | 'geometry';
  /** Random seed for reproducible textures */
  texture_seed?: number;

  // --- Geometry options ---
  /** Face count limit */
  face_limit?: number;
  /** Enable quad mesh output (forces FBX format) */
  quad?: boolean;
  /** Generate hand-crafted low-poly topology */
  smart_low_poly?: boolean;
  /** Generate segmented model with editable parts */
  generate_parts?: boolean;
  /** Geometry quality: "standard" or "detailed" (v3.0+ Ultra Mode) */
  geometry_quality?: 'standard' | 'detailed';
  /** Controls UV unwrapping during generation (default: true) */
  export_uv?: boolean;

  // --- Sizing and orientation ---
  /** Scale to real-world dimensions (meters) */
  auto_size?: boolean;
  /** Model orientation */
  orientation?: 'default' | 'align_image';

  // --- Seeds ---
  /** Random seed for reproducible geometry */
  model_seed?: number;
  /** Random seed for prompt-based image process (text_to_model) */
  image_seed?: number;

  // --- Compression ---
  /** Apply compression (meshopt) */
  compress?: 'geometry';

  // --- Image input options ---
  /** Optimize input image for better results (slower) */
  enable_image_autofix?: boolean;
  /** Transform object to T-pose (generate_image) */
  t_pose?: boolean;
  /** Transform sketch to rendered image (generate_image) */
  sketch_to_render?: boolean;

  // --- Rigging options ---
  /** Output format for rigging/animation */
  out_format?: 'glb' | 'fbx';
  /** Skeleton type for rigging */
  rig_type?: 'biped' | 'quadruped' | 'hexapod' | 'octopod' | 'avian' | 'serpentine' | 'aquatic';
  /** Rigging method */
  spec?: 'mixamo' | 'tripo';

  // --- Animation options ---
  /** Single animation preset for retargeting */
  animation?: string;
  /** Multiple animation presets for retargeting (max 5) */
  animations?: string[];
  /** Bake animation into model on output (default: true, GLB only) */
  bake_animation?: boolean;
  /** Include geometry in animation output (default: true) */
  export_with_geometry?: boolean;
  /** Animate in fixed place */
  animate_in_place?: boolean;

  // --- Mesh editing options ---
  /** Part names from mesh segmentation */
  part_names?: string[];
  /** Bake textures/model during generation (default: true) */
  bake?: boolean;

  // --- Stylization options ---
  /** Grid size for minecraft style (32-128, default: 80) */
  block_size?: number;

  // --- Conversion options ---
  /** Force symmetry for quad remeshing */
  force_symmetry?: boolean;
  /** Flatten the bottom of converted model */
  flatten_bottom?: boolean;
  /** Bottom flatten depth (default: 0.01) */
  flatten_bottom_threshold?: number;
  /** Diffuse color texture size in pixels (default: 2048 or 4096) */
  texture_size?: number;
  /** Diffuse color texture format (e.g. JPEG, PNG, BMP, TIFF, WEBP) */
  texture_format?: string;
  /** Set pivot to center bottom */
  pivot_to_center_bottom?: boolean;
  /** Scale factor (default: 1) */
  scale_factor?: number;
  /** Include skeletal binding and animation in export (default: true) */
  with_animation?: boolean;
  /** Combine UV islands into unified layout (default: false) */
  pack_uv?: boolean;
  /** Include vertex colors in export (OBJ/GLTF only) */
  export_vertex_colors?: boolean;
  /** Model facing direction (default: "+x") */
  export_orientation?: string;
  /** Target platform for FBX export compatibility (experimental) */
  fbx_preset?: string;
}

/**
 * Hunyuan (Tencent Cloud) specific generation options
 */
export interface HunyuanOptions {
  /** Enable PBR materials (default: false) */
  EnablePBR?: boolean;
  /** Face count (40,000 - 1,500,000) */
  FaceCount?: number;
  /** Generation mode */
  GenerateType?: 'Normal' | 'LowPoly' | 'Geometry' | 'Sketch';
  /** Polygon type */
  PolygonType?: 'triangle' | 'quadrilateral';

  /** Output format (rapid version) */
  ResultFormat?: 'OBJ' | 'GLB' | 'STL' | 'USDZ' | 'FBX' | 'MP4';

  /** Multi-view images (additional views beyond the front image) */
  MultiViewImages?: Array<{
    ViewType: 'left' | 'right' | 'back' | 'top' | 'bottom' | 'left_front' | 'right_front';
    ViewImageUrl?: string;
    ViewImageBase64?: string;
  }>;

  /** Face level for reduce face operation */
  FaceLevel?: 'high' | 'medium' | 'low';
}

// ============================================
// Base task params interface
// ============================================

/**
 * Base interface for all task parameters
 */
interface BaseTaskParams<T = unknown> {
  /** Task type determining the operation */
  type: TaskType;
  /** Provider-specific options */
  providerOptions?: T;
}

// ============================================
// Primary generation task params
// ============================================

/**
 * Parameters for text-to-3D generation
 */
export interface TextTo3DParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.TEXT_TO_3D;
  /** Text prompt describing the 3D model */
  prompt: string;
  /** Negative prompt (things to avoid) */
  negative_prompt?: string;
}

/**
 * Parameters for image-to-3D generation
 */
export interface ImageTo3DParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.IMAGE_TO_3D;
  /** Image URL (must be publicly accessible) */
  input: RemoteUrl;
}

/**
 * Parameters for multi-view image to 3D generation
 */
export interface MultiviewTo3DParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.MULTIVIEW_TO_3D;
  /** Array of image URLs [front, left, back, right] */
  inputs: RemoteUrl[];
}

// ============================================
// Post-processing task params
// ============================================

/**
 * Parameters for texture generation/enhancement
 */
export interface TextureParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.TEXTURE;
  /** Source task ID of the model to texture (Tripo) */
  taskId?: string;
  /** Direct model URL (Hunyuan - alternative to taskId) */
  modelUrl?: RemoteUrl;
  /** Text prompt for texture generation */
  prompt?: string;
  /** Reference image URL for style */
  styleImage?: RemoteUrl;
  /** Enable PBR materials */
  enablePBR?: boolean;
}

/**
 * Parameters for model refinement
 */
export interface RefineParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.REFINE;
  /** Source task ID of the model to refine */
  taskId: string;
  /** Quality level */
  quality?: 'standard' | 'high' | 'ultra';
}

/**
 * Parameters for adding skeletal rigging
 */
export interface RigParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.RIG;
  /** Source task ID of the model to rig */
  taskId: string;
  /** Skeleton type */
  skeleton?: 'humanoid' | 'biped' | 'quadruped' | 'hexapod' | 'octopod' | 'avian' | 'serpentine' | 'aquatic' | 'auto';
  /** Output format */
  outFormat?: 'glb' | 'fbx';
}

/**
 * Parameters for applying animation
 */
export interface AnimateParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.ANIMATE;
  /** Source task ID of the rigged model */
  taskId: string;
  /** Animation preset name */
  animation: string;
  /** Output format */
  outFormat?: 'glb' | 'fbx';
  /** Animate in place without movement */
  animateInPlace?: boolean;
}

/**
 * Parameters for mesh segmentation / part generation
 */
export interface SegmentParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.SEGMENT;
  /** Source task ID of the model to segment (Tripo) */
  taskId?: string;
  /** Direct model URL (Hunyuan - alternative to taskId) */
  modelUrl?: RemoteUrl;
}

/**
 * Parameters for polygon reduction (decimation)
 */
export interface DecimateParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.DECIMATE;
  /** Source task ID of the model to decimate (Tripo) */
  taskId?: string;
  /** Direct model URL (Hunyuan - alternative to taskId) */
  modelUrl?: RemoteUrl;
  /** Target polygon/face count */
  targetFaceCount?: number;
  /** Use quad faces instead of triangles */
  quad?: boolean;
  /** Bake textures after decimation */
  bake?: boolean;
}

/**
 * Parameters for UV unwrapping
 */
export interface UVUnwrapParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.UV_UNWRAP;
  /** Source task ID or model URL */
  taskId?: string;
  /** Direct model URL (alternative to taskId) */
  modelUrl?: RemoteUrl;
}

/**
 * Parameters for format conversion
 */
export interface ConvertParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.CONVERT;
  /** Source task ID of the model to convert */
  taskId: string;
  /** Target format */
  format: 'gltf' | 'glb' | 'fbx' | 'obj' | 'usdz' | 'stl' | '3mf';
  /** Enable quad remeshing */
  quad?: boolean;
  /** Face limit for conversion */
  faceLimit?: number;
  /** Texture size in pixels */
  textureSize?: number;
  /** Scale factor */
  scaleFactor?: number;
}

/**
 * Parameters for importing external models
 */
export interface ImportParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.IMPORT;
  /** Model file URL or upload token */
  input: string;
}

/**
 * Parameters for text-to-image generation
 */
export interface TextToImageParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.TEXT_TO_IMAGE;
  /** Text prompt directing image generation */
  prompt: string;
  /** Negative prompt (things to avoid) */
  negative_prompt?: string;
}

/**
 * Parameters for advanced image generation
 */
export interface GenerateImageParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.GENERATE_IMAGE;
  /** Text prompt directing generation */
  prompt: string;
  /** Optional single image input URL */
  input?: RemoteUrl;
  /** Optional multiple image input URLs */
  inputs?: RemoteUrl[];
}

/**
 * Parameters for mesh completion (fill/repair mesh parts)
 */
export interface MeshCompletionParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.MESH_COMPLETION;
  /** Source task ID of a mesh_segmentation task */
  taskId: string;
  /** Part names to complete (from segmentation) */
  partNames?: string[];
}

/**
 * Parameters for pre-rig check
 */
export interface PreRigCheckParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.PRE_RIG_CHECK;
  /** Source task ID of the model to check */
  taskId: string;
}

/**
 * Parameters for model stylization
 */
export interface StylizeParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.STYLIZE;
  /** Source task ID of the model to stylize */
  taskId: string;
  /** Style to apply */
  style: 'lego' | 'voxel' | 'voronoi' | 'minecraft';
}

/**
 * Parameters for face-to-3D character generation (Hunyuan only)
 */
export interface ProfileTo3DParams<T = unknown> extends BaseTaskParams<T> {
  type: TaskType.PROFILE_TO_3D;
  /** Face photo URL or base64 */
  input: RemoteUrl;
  /** Character template preset */
  template: string;
}

// ============================================
// Unified TaskParams type
// ============================================

/**
 * Union type for all task parameters.
 *
 * @remarks
 * This is a discriminated union based on the `type` field.
 * Use type guards or switch statements to narrow the type.
 *
 * @example
 * ```typescript
 * // Text-to-3D
 * const params: TaskParams = {
 *   type: TaskType.TEXT_TO_3D,
 *   prompt: 'a cute cat'
 * };
 *
 * // Rigging a model
 * const params: TaskParams = {
 *   type: TaskType.RIG,
 *   taskId: 'original-task-id',
 *   skeleton: 'humanoid'
 * };
 *
 * // Format conversion
 * const params: TaskParams = {
 *   type: TaskType.CONVERT,
 *   taskId: 'original-task-id',
 *   format: 'fbx'
 * };
 * ```
 */
export type TaskParams<T = unknown> =
  // Primary generation
  | TextTo3DParams<T>
  | ImageTo3DParams<T>
  | MultiviewTo3DParams<T>
  // Image generation
  | TextToImageParams<T>
  | GenerateImageParams<T>
  // Texture & refinement
  | TextureParams<T>
  | RefineParams<T>
  // Animation & rigging
  | PreRigCheckParams<T>
  | RigParams<T>
  | AnimateParams<T>
  // Mesh operations
  | SegmentParams<T>
  | MeshCompletionParams<T>
  | DecimateParams<T>
  | UVUnwrapParams<T>
  // Avatar
  | ProfileTo3DParams<T>
  // Utility
  | ConvertParams<T>
  | ImportParams<T>
  | StylizeParams<T>;

// ============================================
// Type Guards
// ============================================

/** Check if params is a primary generation task (creates new model) */
export function isPrimaryGenerationTask(params: TaskParams): params is TextTo3DParams | ImageTo3DParams | MultiviewTo3DParams {
  return [TaskType.TEXT_TO_3D, TaskType.IMAGE_TO_3D, TaskType.MULTIVIEW_TO_3D].includes(params.type);
}

/** Check if params is a post-processing task (operates on existing model) */
export function isPostProcessTask(params: TaskParams): boolean {
  return !isPrimaryGenerationTask(params) && params.type !== TaskType.IMPORT;
}

/** Check if params requires a source taskId */
export function requiresTaskId(params: TaskParams): params is TaskParams & { taskId: string } {
  return 'taskId' in params && typeof params.taskId === 'string';
}

// Individual type guards for each task type
export function isTextTo3DParams(params: TaskParams): params is TextTo3DParams { return params.type === TaskType.TEXT_TO_3D; }
export function isImageTo3DParams(params: TaskParams): params is ImageTo3DParams { return params.type === TaskType.IMAGE_TO_3D; }
export function isMultiviewTo3DParams(params: TaskParams): params is MultiviewTo3DParams { return params.type === TaskType.MULTIVIEW_TO_3D; }
export function isTextureParams(params: TaskParams): params is TextureParams { return params.type === TaskType.TEXTURE; }
export function isRefineParams(params: TaskParams): params is RefineParams { return params.type === TaskType.REFINE; }
export function isRigParams(params: TaskParams): params is RigParams { return params.type === TaskType.RIG; }
export function isAnimateParams(params: TaskParams): params is AnimateParams { return params.type === TaskType.ANIMATE; }
export function isSegmentParams(params: TaskParams): params is SegmentParams { return params.type === TaskType.SEGMENT; }
export function isDecimateParams(params: TaskParams): params is DecimateParams { return params.type === TaskType.DECIMATE; }
export function isUVUnwrapParams(params: TaskParams): params is UVUnwrapParams { return params.type === TaskType.UV_UNWRAP; }
export function isConvertParams(params: TaskParams): params is ConvertParams { return params.type === TaskType.CONVERT; }
export function isImportParams(params: TaskParams): params is ImportParams { return params.type === TaskType.IMPORT; }
export function isTextToImageParams(params: TaskParams): params is TextToImageParams { return params.type === TaskType.TEXT_TO_IMAGE; }
export function isGenerateImageParams(params: TaskParams): params is GenerateImageParams { return params.type === TaskType.GENERATE_IMAGE; }
export function isMeshCompletionParams(params: TaskParams): params is MeshCompletionParams { return params.type === TaskType.MESH_COMPLETION; }
export function isPreRigCheckParams(params: TaskParams): params is PreRigCheckParams { return params.type === TaskType.PRE_RIG_CHECK; }
export function isStylizeParams(params: TaskParams): params is StylizeParams { return params.type === TaskType.STYLIZE; }
export function isProfileTo3DParams(params: TaskParams): params is ProfileTo3DParams { return params.type === TaskType.PROFILE_TO_3D; }
