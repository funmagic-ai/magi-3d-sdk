// examples/nextjs-api-route.ts
// Example Next.js API routes for Magi 3D SDK
// Copy these to your Next.js app/api/3d/ folder

// ============================================
// app/api/3d/generate/route.ts
// ============================================

import { TripoProvider } from 'magi-3d/server';
import type { GenerateParams } from 'magi-3d/server';

// Initialize provider (do this once, outside the handler)
const provider = new TripoProvider({
  apiKey: process.env.TRIPO_API_KEY!
});

export async function POST(req: Request) {
  try {
    const params: GenerateParams = await req.json();

    // Use SDK to create task
    const taskId = await provider.generate(params);

    return Response.json({ taskId });
  } catch (error) {
    console.error('Generate error:', error);
    return Response.json(
      { message: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}


// ============================================
// app/api/3d/task/[taskId]/route.ts
// ============================================

// import { TripoProvider } from 'magi-3d/server';

// const provider = new TripoProvider({
//   apiKey: process.env.TRIPO_API_KEY!
// });

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;

    // Use SDK to get task status
    const task = await provider.getTaskStatus(taskId);

    return Response.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return Response.json(
      { message: error instanceof Error ? error.message : 'Failed to get task' },
      { status: 500 }
    );
  }
}


// ============================================
// app/api/3d/postprocess/route.ts
// ============================================

// import { TripoProvider } from 'magi-3d/server';
// import type { PostProcessParams } from 'magi-3d/server';

// const provider = new TripoProvider({
//   apiKey: process.env.TRIPO_API_KEY!
// });

export async function POST_postprocess(req: Request) {
  try {
    const params = await req.json();

    // Use SDK to create post-processing task
    const taskId = await provider.postprocess(params);

    return Response.json({ taskId });
  } catch (error) {
    console.error('Postprocess error:', error);
    return Response.json(
      { message: error instanceof Error ? error.message : 'Post-processing failed' },
      { status: 500 }
    );
  }
}
