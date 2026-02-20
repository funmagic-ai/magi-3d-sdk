---
name: tripo-3d-api
description: Orchestrates Tripo3D API calls for 3D model generation from text or images, texturing, rigging, animation, mesh editing, stylization, and format conversion. Use when the user wants to generate 3D models, animate characters, convert 3D formats, or interact with the Tripo3D API.
---

# Tripo3D API Orchestration

## 1. Auth & Base URL

Base URL: `https://api.tripo3d.ai/v2/openapi`
Auth header: `Authorization: Bearer tsk_***`
Content-Type: `application/json`

## 2. Core Pattern: Create -> Poll -> Chain

Every workflow follows three phases:

**Phase 1 -- Create task**
```
POST /task
Body: { "type": "<task_type>", ...params }
Response: { "code": 0, "data": { "task_id": "<uuid>" } }
```

**Phase 2 -- Poll until done**
```
GET /task/<task_id>
Poll every 2-5 seconds until status is finalized.
Finalized: success | failed | banned | expired | cancelled | unknown
Only "success" means output URLs are available.
```

**Phase 3 -- Chain to next task**
Use the completed `task_id` as `original_model_task_id` (or `draft_model_task_id` for `refine_model`) in the next task's body.

**Key rules:**
- Upload files first (Section 6), then reference via `file_token`, `url`, or `object`.
- Source task must have `status="success"` and must use the SAME API key.
- All output URLs expire after **5 minutes**. Re-poll to get fresh URLs.
- On `code: 2000` (rate limit), back off and retry.

## 3. Task Dependency Graph

### Table A: Valid Input Chains

Which task types each task accepts as `original_model_task_id` (or equivalent).

| Task Type | Input Field | Accepts These Source Task Types |
|---|---|---|
| `texture_model` | `original_model_task_id` | `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `import_model` |
| `mesh_segmentation` | `original_model_task_id` | `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `import_model`, `highpoly_to_lowpoly` |
| `mesh_completion` | `original_model_task_id` | `mesh_segmentation` ONLY |
| `highpoly_to_lowpoly` | `original_model_task_id` | `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `import_model`, `mesh_segmentation`, `mesh_completion` |
| `animate_prerigcheck` | `original_model_task_id` | any model-producing task |
| `animate_rig` | `original_model_task_id` | any model-producing task |
| `animate_retarget` | `original_model_task_id` | `animate_rig` ONLY |
| `stylize_model` | `original_model_task_id` | `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `import_model`, `animate_rig`, `animate_retarget` |
| `convert_model` | `original_model_task_id` | `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `import_model`, `animate_rig`, `animate_retarget`, `convert_model` (re-conversion) |
| `refine_model` | `draft_model_task_id` (NOT `original_model_task_id`) | `text_to_model`, `image_to_model`, `multiview_to_model` (only `model_version` < v2.0) |

**Note:** `text_to_image` and `generate_image` produce images, not models. Their `generated_image` URL can be used as `file.url` input for `image_to_model`, but they are NOT linked via `original_model_task_id`.

### Table B: Task Output Fields (on success)

| Task Type | Output Fields |
|---|---|
| `text_to_image` | `generated_image` |
| `generate_image` | `generated_image` |
| `text_to_model` | `model`, `base_model`, `pbr_model`, `rendered_image` |
| `image_to_model` | `model`, `base_model`, `pbr_model`, `rendered_image` |
| `multiview_to_model` | `model`, `base_model`, `pbr_model`, `rendered_image` |
| `refine_model` | `model`, `rendered_image` |
| `texture_model` | `model`, `pbr_model`, `rendered_image` |
| `import_model` | `model` |
| `mesh_segmentation` | `model` |
| `mesh_completion` | `model` |
| `highpoly_to_lowpoly` | `model` |
| `animate_prerigcheck` | `riggable` (bool), `rig_type` (string) -- NO model URL |
| `animate_rig` | `model` |
| `animate_retarget` | `model` |
| `stylize_model` | `model` |
| `convert_model` | `model` |

All URL fields expire after 5 minutes. Re-poll to refresh.

## 4. Common Workflow Pipelines

Always poll each task to `success` before starting the next step.

### Pipeline 1: Text to Final Model

Generate a 3D model from text and export as FBX/USDZ/OBJ.

```
Step 1: POST /task { "type": "text_to_model", "prompt": "..." }
        Poll -> task_id_1, output has model URL (GLB)
Step 2: POST /task { "type": "convert_model",
                     "original_model_task_id": "<task_id_1>",
                     "format": "FBX" }
        Poll -> output has model URL in target format
```

### Pipeline 2: Image to Final Model

Upload an image, generate a 3D model, export.

```
Step 1: Upload image (Section 6) -> get file_token or object
Step 2: POST /task { "type": "image_to_model",
                     "file": { "type": "png", "file_token": "<token>" } }
        Poll -> task_id_1
Step 3: POST /task { "type": "convert_model",
                     "original_model_task_id": "<task_id_1>",
                     "format": "USDZ" }
        Poll -> output has model URL
```

### Pipeline 3: Image to Animated Character

Upload image, generate model, rig, animate, export.

```
Step 1: Upload image -> file_token or object
Step 2: POST /task { "type": "image_to_model",
                     "file": { "type": "png", "file_token": "<token>" } }
        Poll -> task_id_model
Step 3: POST /task { "type": "animate_prerigcheck",
                     "original_model_task_id": "<task_id_model>" }
        Poll -> check output.riggable and output.rig_type
Step 4: POST /task { "type": "animate_rig",
                     "original_model_task_id": "<task_id_model>",
                     "rig_type": "<rig_type from step 3>" }
        Poll -> task_id_rig
Step 5: POST /task { "type": "animate_retarget",
                     "original_model_task_id": "<task_id_rig>",
                     "animation": "preset:walk" }
        Poll -> task_id_anim
Step 6: POST /task { "type": "convert_model",
                     "original_model_task_id": "<task_id_anim>",
                     "format": "FBX" }
        Poll -> output has animated model URL
```

### Pipeline 4: Mesh Editing

Generate a model, segment it, complete missing parts.

```
Step 1: POST /task { "type": "text_to_model", "prompt": "..." }
        Poll -> task_id_model
Step 2: POST /task { "type": "mesh_segmentation",
                     "original_model_task_id": "<task_id_model>" }
        Poll -> task_id_seg
Step 3: POST /task { "type": "mesh_completion",
                     "original_model_task_id": "<task_id_seg>",
                     "part_names": ["arm_left"] }
        Poll -> task_id_comp
```

**Note:** `mesh_completion` output cannot be chained to `texture_model` or `convert_model`. To re-texture, apply `texture_model` BEFORE segmentation. To create a low-poly version after completion, chain to `highpoly_to_lowpoly`.

### Pipeline 5: Import and Post-Process

Import an existing 3D model and apply Tripo post-processing.

```
Step 1: Get STS token: POST /upload/sts/token { "format": "glb" }
Step 2: Upload file to S3 using STS credentials
Step 3: POST /task { "type": "import_model",
                     "file": { "object": { "bucket": "tripo-data",
                                           "key": "<resource_uri>" } } }
        Poll -> task_id_import
Step 4: Use task_id_import as original_model_task_id for any
        post-processing task (texture_model, stylize_model,
        convert_model, etc.)
```

### Pipeline 6: Text to Image to Model

Generate an image from text, then use it to create a 3D model.

```
Step 1: POST /task { "type": "text_to_image", "prompt": "..." }
        Poll -> output.generated_image is a URL
Step 2: POST /task { "type": "image_to_model",
                     "file": { "type": "png",
                               "url": "<generated_image URL from step 1>" } }
        Poll -> task_id_model
Step 3: (Optional) convert, texture, animate, etc.
```

**Note:** `text_to_image` output is linked by URL, not by task_id. Use the `generated_image` URL as `file.url` in the next task.

### Pipeline 7: Low-Poly Game Asset

Generate a model and create a low-poly version for games.

```
Step 1: POST /task { "type": "text_to_model", "prompt": "...",
                     "model_version": "v2.5-20250123" }
        Poll -> task_id_model
Step 2: POST /task { "type": "highpoly_to_lowpoly",
                     "original_model_task_id": "<task_id_model>",
                     "face_limit": 5000, "quad": true }
        Poll -> task_id_lowpoly
Step 3: POST /task { "type": "convert_model",
                     "original_model_task_id": "<task_id_lowpoly>",
                     "format": "FBX" }
        Poll -> output has low-poly model URL
```

## 5. Task Types (16 total)

| # | Task Type | Purpose |
|---|---|---|
| 1 | `text_to_image` | Generate image from text |
| 2 | `generate_image` | Advanced image generation with image prompts |
| 3 | `text_to_model` | Generate 3D model from text |
| 4 | `image_to_model` | Generate 3D model from image |
| 5 | `multiview_to_model` | Generate 3D model from 4 views [front, left, back, right] |
| 6 | `refine_model` | Refine draft model (model_version < v2.0 only) |
| 7 | `texture_model` | Apply/re-apply textures to a model |
| 8 | `import_model` | Import external 3D model into Tripo |
| 9 | `mesh_segmentation` | Segment model into parts |
| 10 | `mesh_completion` | Complete missing parts after segmentation |
| 11 | `highpoly_to_lowpoly` | Create low-poly version |
| 12 | `animate_prerigcheck` | Check if model is riggable |
| 13 | `animate_rig` | Add skeletal rig to model |
| 14 | `animate_retarget` | Apply animation presets to rigged model |
| 15 | `stylize_model` | Apply style (lego, voxel, voronoi, minecraft) |
| 16 | `convert_model` | Convert format (GLTF, USDZ, FBX, OBJ, STL, 3MF) |

For detailed per-task parameters, see [tripo-llm.txt](tripo-llm.txt) Sections 4-9.

## 6. File Upload & Input Reference

### STS Upload (Recommended)

Two-step process:

**Step 1: Get STS token**
```
POST /upload/sts/token
Body: { "format": "glb" }   // or png, jpeg, webp, obj, fbx, stl
Response data: {
  "s3_host": "s3.us-west-2.amazonaws.com",
  "resource_bucket": "tripo-data",
  "resource_uri": "<path>/input.<ext>",
  "session_token": "<token>",
  "sts_ak": "<access_key_id>",
  "sts_sk": "<secret_access_key>"
}
```

**Step 2: Upload to S3**
```bash
aws configure set aws_access_key_id "$sts_ak"
aws configure set aws_secret_access_key "$sts_sk"
aws configure set aws_session_token "$session_token"
aws configure set region "us-west-2"
aws s3 cp "$file_path" "s3://$resource_bucket/$resource_uri"
```

For non-US users or files > 100KB, add `--endpoint-url "https://s3-accelerate.amazonaws.com"`.

### Direct Upload (small images only)

```
POST /upload/sts  (multipart/form-data)
Field: file (webp, jpeg, png; 20px-6000px)
Response: { "data": { "image_token": "<uuid>" } }
```

### File Object Structure

All file inputs use this structure. `file_token`, `url`, and `object` are mutually exclusive -- use exactly one.

```json
{
  "type": "png",
  "file_token": "<from Direct Upload>",
  "url": "<direct URL, JPEG/PNG only, max 20MB>",
  "object": { "bucket": "tripo-data", "key": "<resource_uri>" }
}
```

**When to use each:**
- `file_token` -- After Direct Upload. Best for small images.
- `url` -- When you have a public URL (e.g. from `text_to_image` output).
- `object` -- After STS Upload. Recommended for large files and 3D models.

**Image constraints:** webp/jpeg/png, 20x20px to 6000x6000px, suggested > 256x256px.

**Tasks using file inputs:**
- `image_to_model`: `file` (required, single image)
- `multiview_to_model`: `files` (required, list of 4 images: [front, left, back, right])
- `generate_image`: `file` (optional) or `files` (optional)
- `texture_model`: `texture_prompt.image` / `texture_prompt.images` / `texture_prompt.style_image`
- `import_model`: `file` (required, 3D model via STS object)

## 7. Error Codes

| Code | HTTP | Description | Suggestion |
|---|---|---|---|
| 1004 | 400 | Invalid parameter(s) | Check API docs |
| 1005 | 403 | Access denied | Check permissions |
| 2000 | 429 | Rate limit exceeded | Back off and retry |
| 2001 | 404 | Task not found | Check task ID / ensure same API key |
| 2002 | 400 | Task type unsupported | Check task type |
| 2003 | 400 | Input file is empty | Check file upload |
| 2004 | 400 | File type unsupported | Check supported formats |
| 2006 | 400 | Invalid original task type | Provide valid source task (see dependency graph) |
| 2007 | 400 | Original task status not success | Wait for source task to succeed |
| 2008 | 400 | Content policy violation | Modify input and retry |
| 2010 | 403 | Insufficient credits | Purchase more credits |
| 2014 | 500 | Audit service error | Retry or contact support |
| 2015 | 400 | Deprecated version | Use higher model version |
| 2016 | 400 | Deprecated task type | Use alternative task type |
| 2017 | 400 | Invalid model version | Check available versions |
| 2018 | 400 | Model too complex to remesh | Try another model |
| 2019 | 404 | File not found in storage | Verify file reference |

## 8. Detailed Reference

For full per-task parameter documentation (model_version options, face_limit ranges, texture_quality values, animation presets, convert_model options, etc.), see [tripo-llm.txt](tripo-llm.txt).

Section index in `tripo-llm.txt`:
- Section 4: Generation tasks (text_to_image, generate_image, text_to_model, image_to_model, multiview_to_model, refine_model)
- Section 5: Texture (texture_model)
- Section 6: Import (import_model)
- Section 7: Mesh editing (mesh_segmentation, mesh_completion, highpoly_to_lowpoly)
- Section 8: Animation (animate_prerigcheck, animate_rig, animate_retarget)
- Section 9: Post-process (stylize_model, convert_model)
