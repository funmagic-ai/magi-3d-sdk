# E2E Test Guidelines

## Quick Start

### 1. Setup

```bash
# Install dependencies
pnpm install

# Create .env file with your API keys
cp .env.example .env
# Edit .env and add your keys
```

### 2. Run Tests

```bash
# Quick test (2 basic tests, ~2 min)
pnpm test:tripo
pnpm test:hunyuan

# Full test suite (~15-20 min)
pnpm test:tripo all
pnpm test:hunyuan all
```

## API Keys

Get your API keys from:

| Provider | Where to get keys |
|----------|-------------------|
| Tripo | https://platform.tripo3d.ai |
| Hunyuan | https://console.cloud.tencent.com/cam/capi |

Your `.env` file should look like:

```env
TRIPO_API_KEY=your-tripo-api-key
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
```

## Test Commands

### Tripo Provider

```bash
pnpm test:tripo              # Quick (2 tests)
pnpm test:tripo all          # All tests
pnpm test:tripo text         # Text-to-3D tests only
pnpm test:tripo image        # Image-to-3D tests only
pnpm test:tripo pipeline     # Pipeline tests (rig, animate, texture, etc.)
pnpm test:tripo <name>       # Run specific test by name
```

### Hunyuan Provider

```bash
pnpm test:hunyuan            # Quick (2 tests)
pnpm test:hunyuan all        # All tests
pnpm test:hunyuan text       # Text-to-3D tests only
pnpm test:hunyuan image      # Image-to-3D tests only
pnpm test:hunyuan pipeline   # Pipeline tests
pnpm test:hunyuan <name>     # Run specific test by name
```

## Available Tests

### Tripo Tests

| Test Name | Type | Description |
|-----------|------|-------------|
| `text-to-3d-basic` | TEXT_TO_3D | Basic prompt |
| `text-to-3d-with-options` | TEXT_TO_3D | With model_version, pbr, texture_quality |
| `text-to-3d-negative-prompt` | TEXT_TO_3D | With negative prompt |
| `image-to-3d-basic` | IMAGE_TO_3D | From URL |
| `image-to-3d-with-prompt` | IMAGE_TO_3D | With refinement prompt |
| `image-to-3d-with-options` | IMAGE_TO_3D | With provider options |
| `pipeline-full` | Pipeline | Text → Rig → Animate → Convert |
| `pipeline-texture` | Pipeline | Text → Re-texture |
| `pipeline-decimate` | Pipeline | Text → Reduce polygons |

### Hunyuan Tests

| Test Name | Type | Description |
|-----------|------|-------------|
| `text-to-3d-basic` | TEXT_TO_3D | Basic Chinese prompt |
| `text-to-3d-with-pbr` | TEXT_TO_3D | EnablePBR=true |
| `text-to-3d-lowpoly` | TEXT_TO_3D | GenerateType=LowPoly |
| `text-to-3d-geometry` | TEXT_TO_3D | Geometry only (no texture) |
| `text-to-3d-high-poly` | TEXT_TO_3D | FaceCount=500000 |
| `image-to-3d-url` | IMAGE_TO_3D | From URL |
| `image-to-3d-base64` | IMAGE_TO_3D | From local file (scripts/image.png) |
| `image-to-3d-with-prompt` | IMAGE_TO_3D | With refinement prompt |
| `image-to-3d-with-options` | IMAGE_TO_3D | EnablePBR + FaceCount |
| `pipeline-decimate` | Pipeline | Text → Reduce faces |
| `pipeline-texture` | Pipeline | Geometry → Add texture |

## Using Local Images

Hunyuan supports base64 images. Place your image at `scripts/image.png` and run:

```bash
pnpm test:hunyuan image-to-3d-base64
```

For Tripo, upload your image to a public URL first, then modify the `TEST_IMAGE_URL` in `test-tripo-full.ts`.

## Example Output

```
╔════════════════════════════════════════════════════════════╗
║          Tripo Provider - Comprehensive E2E Tests          ║
╚════════════════════════════════════════════════════════════╝

[TEST] Text-to-3D - Basic
   Prompt: "a simple wooden chair"
   Task ID: abc123-def456
   [====================] 100% - SUCCEEDED
   Result:
     Status: SUCCEEDED
     GLB: https://tripo-data...

════════════════════════════════════════════════════════════
                        TEST SUMMARY
════════════════════════════════════════════════════════════
  ✓ text-to-3d-basic
  ✓ image-to-3d-basic

  Total: 2 | Passed: 2 | Failed: 0
════════════════════════════════════════════════════════════
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `TRIPO_API_KEY required` | Add key to `.env` file |
| `TENCENT_SECRET_ID required` | Add both ID and KEY to `.env` |
| `Task timed out` | Increase timeout or retry later |
| `TripoProvider requires URL` | Use URL, not local file path |

## Test Timeouts

| Provider | Default Timeout |
|----------|-----------------|
| Tripo | 5 minutes per task |
| Hunyuan | 10 minutes per task |

Pipeline tests may take longer as they run multiple sequential tasks.
