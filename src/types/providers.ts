/**
 * @module types/providers
 * @description Static provider metadata for frontend usage
 */

import { ProviderId, TaskType } from './enums';

/**
 * List of all available provider IDs.
 * Use this to populate provider selection UI.
 *
 * @example
 * ```tsx
 * import { PROVIDERS } from 'magi-3d/react';
 *
 * function ProviderSelect() {
 *   return (
 *     <select>
 *       {PROVIDERS.map(id => <option key={id} value={id}>{id}</option>)}
 *     </select>
 *   );
 * }
 * ```
 */
export const PROVIDERS = [ProviderId.TRIPO, ProviderId.HUNYUAN] as const;

/**
 * Mapping of provider IDs to their supported task types.
 * Use this to show available operations for a selected provider.
 *
 * @example
 * ```tsx
 * import { PROVIDER_TASK_TYPES, ProviderId } from 'magi-3d/react';
 *
 * const taskTypes = PROVIDER_TASK_TYPES[ProviderId.TRIPO];
 * // => [TaskType.TEXT_TO_3D, TaskType.IMAGE_TO_3D, ...]
 * ```
 */
export const PROVIDER_TASK_TYPES: Record<ProviderId, readonly TaskType[]> = {
  [ProviderId.TRIPO]: [
    TaskType.TEXT_TO_3D,
    TaskType.IMAGE_TO_3D,
    TaskType.MULTIVIEW_TO_3D,
    TaskType.TEXTURE,
    TaskType.REFINE,
    TaskType.RIG,
    TaskType.ANIMATE,
    TaskType.SEGMENT,
    TaskType.DECIMATE,
    TaskType.CONVERT,
    TaskType.IMPORT
  ],
  [ProviderId.HUNYUAN]: [
    TaskType.TEXT_TO_3D,
    TaskType.IMAGE_TO_3D,
    TaskType.TEXTURE,
    TaskType.DECIMATE,
    TaskType.UV_UNWRAP,
    TaskType.SEGMENT,
    TaskType.CONVERT
  ]
} as const;
