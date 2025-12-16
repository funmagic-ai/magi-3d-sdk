// examples/browser-react.tsx
// React browser example for Magi 3D SDK
// Uses the new React hooks pattern (similar to Vercel AI SDK)

import React, { useState } from 'react';
import { useGenerate3D, usePostProcess } from 'magi-3d/react';

/**
 * Text-to-3D Generator Component
 *
 * Uses the useGenerate3D hook which handles:
 * - Submitting tasks to your backend POST /api/3d/generate
 * - Polling GET /api/3d/task/:id for status
 * - Progress tracking
 */
export function TextTo3DGenerator() {
  const [prompt, setPrompt] = useState('');

  const { generate, task, isLoading, progress, error } = useGenerate3D({
    api: '/api/3d',
    onSuccess: (task) => {
      console.log('Generation complete!', task.result?.modelGlb);
    },
    onError: (error) => {
      console.error('Generation failed:', error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    generate({
      type: 'TEXT_TO_3D',
      prompt: prompt.trim(),
      providerOptions: {
        model_version: 'v2.5-20250123',
        pbr: true
      }
    });
  };

  return (
    <div className="container">
      <h1>Text to 3D</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your 3D model..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !prompt.trim()}>
          {isLoading ? `Generating (${progress}%)` : 'Generate'}
        </button>
      </form>

      {/* Progress */}
      {isLoading && (
        <div className="progress-section">
          <progress value={progress} max={100} />
          <p>{task?.progressDetail || 'Processing...'}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-section" style={{ color: 'red' }}>
          {error.message}
        </div>
      )}

      {/* Result */}
      {task?.status === 'SUCCEEDED' && task.result && (
        <div className="result-section">
          <h3>Complete!</h3>
          {task.result.modelGlb && (
            <a href={task.result.modelGlb} download>
              Download GLB
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Image-to-3D Generator Component
 *
 * Shows file upload flow with the useGenerate3D hook
 */
export function ImageTo3DGenerator() {
  const { generate, task, isLoading, progress, error } = useGenerate3D({
    api: '/api/3d',
    onSuccess: (task) => {
      console.log('Generation complete!', task.result?.modelGlb);
    }
  });

  async function handleFileUpload(file: File) {
    // Step 1: Upload file to your backend first
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('File upload failed');
    }

    const { url } = await uploadResponse.json();

    // Step 2: Use the hook to generate
    generate({
      type: 'IMAGE_TO_3D',
      input: url,
      providerOptions: {
        pbr: true,
        texture_quality: 'standard'
      }
    });
  }

  return (
    <div className="container">
      <h1>Image to 3D</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={isLoading}
      />

      {isLoading && (
        <div className="progress-section">
          <progress value={progress} max={100} />
          <p>{progress}% - {task?.progressDetail || 'Processing...'}</p>
        </div>
      )}

      {error && (
        <div className="error-section" style={{ color: 'red' }}>
          {error.message}
        </div>
      )}

      {task?.status === 'SUCCEEDED' && task.result?.modelGlb && (
        <div className="result-section">
          <model-viewer
            src={task.result.modelGlb}
            alt="Generated 3D model"
            auto-rotate
            camera-controls
            style={{ width: '100%', height: '500px' }}
          />
          <a href={task.result.modelGlb} download>Download GLB</a>
        </div>
      )}
    </div>
  );
}

/**
 * Model Post-Processing Component
 *
 * Uses the usePostProcess hook for format conversion, rigging, etc.
 */
export function ModelConverter({ originalTaskId }: { originalTaskId: string }) {
  const { postProcess, task, isLoading, progress, error } = usePostProcess({
    api: '/api/3d',
    onSuccess: (task) => {
      console.log('Conversion complete!');
    }
  });

  return (
    <div>
      <h3>Convert Model</h3>

      <button
        onClick={() => postProcess({
          action: 'CONVERT',
          taskId: originalTaskId,
          format: 'fbx'
        })}
        disabled={isLoading}
      >
        {isLoading ? `Converting (${progress}%)` : 'Convert to FBX'}
      </button>

      <button
        onClick={() => postProcess({
          action: 'RIG',
          taskId: originalTaskId
        })}
        disabled={isLoading}
      >
        {isLoading ? `Rigging (${progress}%)` : 'Add Rig'}
      </button>

      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      {task?.status === 'SUCCEEDED' && (
        <p>Done! Check task result for download links.</p>
      )}
    </div>
  );
}
