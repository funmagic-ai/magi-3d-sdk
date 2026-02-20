# Provider Options Reference

Complete reference for all provider configurations, task types, and provider-specific options.

## Supported Providers

| Feature | Tripo | Hunyuan |
|---------|-------|---------|
| Auth | API Key (`TRIPO_API_KEY`) | SecretId + SecretKey (`HUNYUAN_*`) |
| Task Types | 16 | 9 |
| Input | URL (+ local files with STS upload) | URL or Base64 |
| Progress | Granular 0-100% | Estimated (0/50/100%) |
| Rigging/Animation | Yes | No |
| Image Generation | Yes | No |
| Avatar Generation | No | Yes |
| Post-processing ref | `taskId` (chaining) | `modelUrl` (direct) |
| Format Conversion | Async (polling) | Sync (immediate) |

## Task Types

All 16 task types with provider support:

| Type | Description | Required Params | Tripo | Hunyuan |
|------|-------------|-----------------|:-----:|:-------:|
| `TEXT_TO_3D` | Generate 3D from text | `prompt` | Yes | Yes |
| `IMAGE_TO_3D` | Generate 3D from image | `input` | Yes | Yes |
| `MULTIVIEW_TO_3D` | Generate 3D from multiple views | `inputs[]` | Yes | Yes |
| `TEXT_TO_IMAGE` | Generate image from text | `prompt` | Yes | - |
| `GENERATE_IMAGE` | Advanced image generation | `prompt` | Yes | - |
| `TEXTURE` | Re-texture model | `taskId` or `modelUrl` | Yes | Yes |
| `REFINE` | Improve model quality | `taskId` | Yes | - |
| `PRE_RIG_CHECK` | Check if model is riggable | `taskId` | Yes | - |
| `RIG` | Add skeleton rigging | `taskId` | Yes | - |
| `ANIMATE` | Apply animation to rigged model | `taskId`, `animation` | Yes | - |
| `SEGMENT` | Split model into parts | `taskId` or `modelUrl` | Yes | Yes |
| `MESH_COMPLETION` | Complete/fill mesh parts | `taskId` | Yes | - |
| `DECIMATE` | Reduce polygon count | `taskId` or `modelUrl` | Yes | Yes |
| `UV_UNWRAP` | UV unwrap model | `modelUrl` | - | Yes |
| `PROFILE_TO_3D` | Face photo to 3D character | `input`, `template` | - | Yes |
| `CONVERT` | Format conversion | `taskId`, `format` | Yes | Yes |
| `IMPORT` | Import external 3D model | `input` | Yes | - |
| `STYLIZE` | Apply artistic style | `taskId`, `style` | Yes | - |

> **Note:** Hunyuan post-processing tasks (TEXTURE, DECIMATE, SEGMENT, UV_UNWRAP) require `modelUrl` instead of `taskId`. Tripo post-processing tasks use `taskId` to chain from a previous task.
>
> **Hunyuan SEGMENT constraint:** The Segment API only accepts FBX format files. If chaining from a text-to-3d or image-to-3d result (which outputs GLB), convert to FBX first using `TaskType.CONVERT`.

---

## Tripo

### Provider Setup

```typescript
import { TripoProvider } from 'magi-3d/server';

// Option 1: Environment variable (recommended)
const provider = new TripoProvider(); // Uses TRIPO_API_KEY

// Option 2: Explicit API key
const provider = new TripoProvider({
  apiKey: 'your-api-key'
});

// Option 3: Enable STS upload (allows local files, localhost URLs, base64)
const provider = new TripoProvider({
  apiKey: 'your-api-key',
  stsUpload: true
});
```

### Model Versions

| Version | Speed | Quality | Notes |
|---------|-------|---------|-------|
| `Turbo-v1.0-20250506` | ~10s | Good | Fast prototyping |
| `v3.0-20250812` | ~60s | Best | Supports `geometry_quality` for Ultra mode |
| `v2.5-20250123` | ~45s | High | Balanced (default) |
| `v2.0-20240919` | ~45s | High | Stable |
| `v1.4-20240625` | ~40s | Medium | Legacy |

### Generation Options (TEXT_TO_3D / IMAGE_TO_3D)

Pass these via `providerOptions`:

```typescript
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a robot',
  providerOptions: {
    model_version: 'v3.0-20250812',
    pbr: true,
    texture_quality: 'detailed',
    geometry_quality: 'detailed'  // v3.0+ only
  }
});
```

**Model & Texture Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model_version` | string | `v2.5-20250123` | Model version |
| `pbr` | boolean | `true` | Enable PBR materials |
| `texture` | boolean | `true` | Enable texturing |
| `texture_quality` | `'standard'` \| `'detailed'` | `standard` | Texture resolution |
| `texture_alignment` | `'original_image'` \| `'geometry'` | `original_image` | Texture alignment (v2.0+) |
| `texture_seed` | number | random | Reproducible textures (v2.0+) |

**Geometry Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `face_limit` | number | - | Max face count |
| `quad` | boolean | `false` | Quad mesh (forces FBX output) (v2.0+) |
| `geometry_quality` | `'standard'` \| `'detailed'` | `standard` | Geometry detail (**v3.0+ only**) |
| `smart_low_poly` | boolean | `false` | Hand-crafted low-poly topology (v2.0+) |
| `generate_parts` | boolean | `false` | Generate segmented editable parts (v2.0+) |
| `export_uv` | boolean | `true` | UV unwrapping during generation |

**Sizing & Orientation:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `auto_size` | boolean | `false` | Real-world scale in meters (v2.0+) |
| `orientation` | `'default'` \| `'align_image'` | `default` | Model orientation (v2.0+) |

**Seeds (for reproducibility):**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model_seed` | number | random | Geometry seed (v2.0+) |
| `image_seed` | number | random | Prompt processing seed (text only) |

**Other:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `compress` | `'geometry'` | - | Apply meshopt compression (v2.0+) |
| `enable_image_autofix` | boolean | `false` | Optimize input image (slower) |
| `negative_prompt` | string | - | Reverse direction prompt (text only) |

### Rigging & Animation Options

```typescript
// Rig
createTask({
  type: TaskType.RIG,
  taskId: modelTaskId,
  skeleton: 'biped',
  outFormat: 'fbx',
  providerOptions: {
    spec: 'mixamo'
  }
});

// Animate
createTask({
  type: TaskType.ANIMATE,
  taskId: riggedTaskId,
  animation: 'preset:walk',
  outFormat: 'glb',
  providerOptions: {
    animate_in_place: true,
    bake_animation: true
  }
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `out_format` | `'glb'` \| `'fbx'` | - | Output format |
| `rig_type` | string | - | `'biped'`, `'quadruped'`, `'hexapod'`, `'octopod'`, `'avian'`, `'serpentine'`, `'aquatic'` |
| `spec` | `'mixamo'` \| `'tripo'` | - | Rigging method |
| `animation` | string | - | Single animation preset (e.g., `'preset:walk'`) |
| `animations` | string[] | - | Multiple presets (max 5) |
| `bake_animation` | boolean | `true` | Bake animation into model (GLB only) |
| `export_with_geometry` | boolean | `true` | Include geometry in export |
| `animate_in_place` | boolean | `false` | Fixed position animation |

### Conversion Options

```typescript
createTask({
  type: TaskType.CONVERT,
  taskId: modelTaskId,
  format: 'fbx',
  providerOptions: {
    export_orientation: '+y',
    fbx_preset: 'mixamo',
    texture_size: 2048
  }
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `quad` | boolean | - | Quad mesh |
| `face_limit` | number | - | Max face count |
| `texture_size` | number | `2048` or `4096` | Texture resolution |
| `texture_format` | string | - | `'JPEG'`, `'PNG'`, `'BMP'`, `'TIFF'`, `'WEBP'` |
| `pack_uv` | boolean | `false` | Pack UV |
| `export_orientation` | string | `'+x'` | `'+x'`, `'-x'`, `'+y'`, `'-y'` |
| `fbx_preset` | string | - | `'blender'`, `'3dsmax'`, `'mixamo'` (experimental) |
| `with_animation` | boolean | `true` | Include animation |
| `bake` | boolean | `true` | Bake textures |
| `flatten_bottom` | boolean | `false` | Flatten bottom |
| `flatten_bottom_threshold` | number | `0.01` | Flatten threshold |
| `pivot_to_center_bottom` | boolean | `false` | Move pivot to center bottom |
| `scale_factor` | number | `1` | Scale factor |
| `export_vertex_colors` | boolean | `false` | Export vertex colors (OBJ/GLTF only) |
| `force_symmetry` | boolean | - | Force symmetry for quad remeshing |

### Stylize Options

```typescript
createTask({
  type: TaskType.STYLIZE,
  taskId: modelTaskId,
  style: 'lego'
});
```

| Style | Description |
|-------|-------------|
| `'lego'` | LEGO brick style |
| `'voxel'` | Voxel art style |
| `'voronoi'` | Voronoi pattern |
| `'minecraft'` | Minecraft block style |

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `block_size` | number | `80` | Grid size for Minecraft style (32-128) |

### Image Generation Options

```typescript
// Text to Image
createTask({
  type: TaskType.TEXT_TO_IMAGE,
  prompt: 'a robot in T-pose'
});

// Advanced Image Generation (with reference image)
createTask({
  type: TaskType.GENERATE_IMAGE,
  prompt: 'a cartoon cat in T-pose',
  input: 'https://example.com/reference.jpg',
  providerOptions: {
    t_pose: true,
    sketch_to_render: false
  }
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `t_pose` | boolean | `false` | Transform object to T-pose |
| `sketch_to_render` | boolean | `false` | Transform sketch to rendered image |

### STS Upload (Local File Support)

By default, Tripo requires publicly accessible URLs. Enable `stsUpload: true` to support local inputs:

```typescript
const provider = new TripoProvider({ stsUpload: true });
```

**Accepted input formats:**
- Public URLs: `https://example.com/image.jpg`
- Localhost URLs: `http://localhost:3000/image.jpg`
- File paths: `/path/to/file.jpg` or `./relative/path.glb`
- Base64: `data:image/png;base64,iVBORw0K...`
- `file://` protocol: `file:///path/to/model.glb`

**Upload method by file type:**
- Images (jpg, jpeg, png, webp): Direct Upload (multipart/form-data) -> returns `file_token`
- 3D models (glb, obj, fbx, stl): STS Upload (S3 with temporary credentials)

Without `stsUpload`, only public URLs are accepted. Local inputs throw an error.

---

## Hunyuan (Tencent Cloud)

### Provider Setup

```typescript
import { HunyuanProvider } from 'magi-3d/server';

// Option 1: Environment variables (recommended)
const provider = new HunyuanProvider({
  region: 'ap-guangzhou'
}); // Uses HUNYUAN_SECRET_ID and HUNYUAN_SECRET_KEY

// Option 2: Explicit credentials
const provider = new HunyuanProvider({
  secretId: 'your-secret-id',
  secretKey: 'your-secret-key',
  region: 'ap-guangzhou'
});
```

### Versions

| Version | Concurrency | Max Faces | Speed | Use Case |
|---------|-------------|-----------|-------|----------|
| **Professional (Pro)** | 3 | 1,500,000 | ~120s | High-quality production |
| **Rapid** | 1 | - | ~30s | Fast prototyping |

### Generation Options (TEXT_TO_3D / IMAGE_TO_3D)

```typescript
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a cute cat',
  providerOptions: {
    EnablePBR: true,
    FaceCount: 500000,
    GenerateType: 'Normal'
  }
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `EnablePBR` | boolean | `false` | Enable PBR materials |
| `FaceCount` | number | `500,000` | Face count (40,000 - 1,500,000) |
| `GenerateType` | string | `'Normal'` | Generation mode (see below) |
| `PolygonType` | `'triangle'` \| `'quadrilateral'` | `triangle` | Mesh type (LowPoly only) |
| `ResultFormat` | string | - | Rapid only: `'OBJ'`, `'GLB'`, `'STL'`, `'USDZ'`, `'FBX'`, `'MP4'` |

**GenerateType Values (Professional):**

| Value | Description | Notes |
|-------|-------------|-------|
| `'Normal'` | Standard textured model | Default |
| `'LowPoly'` | Optimized low-poly | Supports `PolygonType` |
| `'Geometry'` | White model (no texture) | `EnablePBR` ignored |
| `'Sketch'` | From sketch/line art | Can combine with `prompt` |

### Texture Options

```typescript
createTask({
  type: TaskType.TEXTURE,
  modelUrl: 'https://example.com/model.glb',
  prompt: 'wooden texture',
  enablePBR: true
});
```

Texture task accepts optional `prompt`, `styleImage` (reference image URL), and `enablePBR` fields directly on the task params.

### Decimate Options

```typescript
createTask({
  type: TaskType.DECIMATE,
  modelUrl: 'https://example.com/model.glb',
  providerOptions: {
    FaceLevel: 'low',
    PolygonType: 'triangle'
  }
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `FaceLevel` | `'high'` \| `'medium'` \| `'low'` | - | Target face reduction level |
| `PolygonType` | `'triangle'` \| `'quadrilateral'` | `triangle` | Mesh type |

### Profile to 3D (Avatar)

```typescript
createTask({
  type: TaskType.PROFILE_TO_3D,
  input: 'https://example.com/face-photo.jpg',
  template: 'basketball'
});
```

**Available templates:** `basketball`, `badminton`, `pingpong`, `gymnastics`, `pilidance`, `tennis`, `athletics`, `footballboykicking1`, `footballboykicking2`, `guitar`, `footballboy`, `skateboard`, `futuresoilder`, `explorer`, `beardollgirl`, `bibpantsboy`, `womansitpose`, `womanstandpose2`, `mysteriousprincess`, `manstandpose2`

### Format Conversion (Synchronous)

Hunyuan format conversion returns results immediately without polling:

```typescript
const convertedTaskId = await client.createTask({
  type: TaskType.CONVERT,
  taskId: modelUrl,  // Hunyuan uses the model URL as taskId
  format: 'fbx'
});

// Result is available immediately
const result = await client.getTask(convertedTaskId);
```

### Progress Reporting

Hunyuan does not return granular progress percentages. The SDK estimates progress based on task status:

| Status | Estimated Progress |
|--------|-------------------|
| `PENDING` (WAIT) | 0% |
| `PROCESSING` (RUN) | 50% |
| `SUCCEEDED` (DONE) | 100% |

The raw Hunyuan status string is available in `task.progressDetail`.

---

## Task Chaining

### Tripo Pipelines

Tripo tasks chain by passing the completed `taskId` of one task as input to the next.

**Text to Animated Character:**

```typescript
// 1. Generate model
const modelId = await client.createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a robot character'
});
await client.pollUntilDone(modelId);

// 2. Check riggability
const checkId = await client.createTask({
  type: TaskType.PRE_RIG_CHECK,
  taskId: modelId
});
const check = await client.pollUntilDone(checkId);

// 3. Rig
if (check.result?.riggable) {
  const rigId = await client.createTask({
    type: TaskType.RIG,
    taskId: modelId,
    skeleton: check.result.rigType || 'biped'
  });
  await client.pollUntilDone(rigId);

  // 4. Animate
  const animId = await client.createTask({
    type: TaskType.ANIMATE,
    taskId: rigId,
    animation: 'preset:walk'
  });
  await client.pollUntilDone(animId);

  // 5. Export as FBX
  const exportId = await client.createTask({
    type: TaskType.CONVERT,
    taskId: animId,
    format: 'fbx'
  });
  const final = await client.pollUntilDone(exportId);
  console.log('Animated FBX:', final.result?.model);
}
```

**Text to Image to Model:**

```typescript
// 1. Generate concept image
const imgId = await client.createTask({
  type: TaskType.TEXT_TO_IMAGE,
  prompt: 'a fantasy sword with glowing runes'
});
const imgResult = await client.pollUntilDone(imgId);

// 2. Use generated image to create 3D model
const modelId = await client.createTask({
  type: TaskType.IMAGE_TO_3D,
  input: imgResult.result!.generatedImage!
});
```

**Import and Stylize:**

```typescript
const provider = new TripoProvider({ stsUpload: true });
const client = new Magi3DClient(provider);

// 1. Import external model
const importId = await client.createTask({
  type: TaskType.IMPORT,
  input: '/path/to/model.glb'
});
await client.pollUntilDone(importId);

// 2. Stylize
const styleId = await client.createTask({
  type: TaskType.STYLIZE,
  taskId: importId,
  style: 'lego'
});
```

### Hunyuan Pipelines

Hunyuan post-processing uses `modelUrl` instead of `taskId`.

**Text to Segmented Parts:**

```typescript
// 1. Generate model
const modelId = await client.createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a bicycle'
});
const modelResult = await client.pollUntilDone(modelId);
const glbUrl = modelResult.result!.model!;

// 2. Convert to FBX (required for segment API)
const convertId = await client.createTask({
  type: TaskType.CONVERT,
  taskId: glbUrl,
  format: 'fbx'
});
const convertResult = await client.pollUntilDone(convertId);
const fbxUrl = convertResult.result!.model!;

// 3. Segment into parts
const segId = await client.createTask({
  type: TaskType.SEGMENT,
  modelUrl: fbxUrl
});
```
