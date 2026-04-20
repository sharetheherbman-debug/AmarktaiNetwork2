/**
 * POST /api/brain/suggestive-video-gen
 *
 * Suggestive (non-explicit) video generation.
 *
 * CURRENT STATE: BLOCKED — no working video provider for this capability.
 * Hugging Face Inference API does not support zeroscope or text-to-video-ms
 * via a stable endpoint. This route returns a truthful 503 with a clear
 * provider requirement until Replicate or another video provider is wired.
 *
 * GATING (still enforced for when a provider is added):
 *   - App must have safeMode=false AND suggestiveMode=true
 *   - All prompts pass through validateSuggestivePrompt() before generation
 *
 * Returns:
 *   { capability, executed: false, error, provider_required, availabilityLevel }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppSafetyConfig, validateSuggestivePrompt } from '@/lib/content-filter';

const ALLOWED_STYLES = ['fashion', 'beach', 'gym', 'lifestyle', 'cinematic'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      appSlug,
      style = 'lifestyle',
      duration = 4,
    } = body as {
      prompt?: string;
      appSlug?: string;
      style?: string;
      duration?: number;
    };

    // ── Input validation ────────────────────────────────────────────────
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'prompt must be 1000 characters or fewer' },
        { status: 400 },
      );
    }

    if (style && !ALLOWED_STYLES.includes(style as typeof ALLOWED_STYLES[number])) {
      return NextResponse.json(
        { error: `style must be one of: ${ALLOWED_STYLES.join(', ')}` },
        { status: 400 },
      );
    }

    if (duration !== undefined && (typeof duration !== 'number' || duration < 1 || duration > 30)) {
      return NextResponse.json(
        { error: 'duration must be a number between 1 and 30 seconds' },
        { status: 400 },
      );
    }

    // ── Per-app gating check ─────────────────────────────────────────────
    if (appSlug) {
      const safetyConfig = getAppSafetyConfig(appSlug);
      if (safetyConfig.safeMode || !safetyConfig.suggestiveMode) {
        return NextResponse.json(
          {
            capability: 'suggestive_video_generation',
            executed: false,
            error:
              'Suggestive video generation is not enabled for this app. ' +
              'Set safeMode=false and suggestiveMode=true in app settings.',
            gating_required: true,
          },
          { status: 403 },
        );
      }
    }

    // ── Prompt validation and sanitization ──────────────────────────────
    const validation = validateSuggestivePrompt(prompt.trim());
    if (!validation.allowed) {
      return NextResponse.json(
        {
          capability: 'suggestive_video_generation',
          executed: false,
          error: validation.reason ?? 'Prompt rejected by safety filter',
          promptBlocked: true,
        },
        { status: 422 },
      );
    }

    // ── Provider gate — Hugging Face video is not a supported endpoint ───
    // The Hugging Face Inference API does not provide a working async video
    // pipeline for models like zeroscope_v2_576w or text-to-video-ms-1.7b.
    // Calling those endpoints produces HTML error pages, not video data.
    // Return a truthful error instead of making a call we know will fail.
    return NextResponse.json(
      {
        capability: 'suggestive_video_generation',
        executed: false,
        error:
          'Video generation failed: unsupported model or provider. ' +
          'Hugging Face does not support this video model via API. ' +
          'Suggestive video generation requires Replicate or another video provider.',
        provider_required: 'replicate',
        availabilityLevel: 'BLOCKED',
      },
      { status: 503 },
    );
  } catch (err) {
    console.error('[suggestive-video-gen] Unhandled error:', err);
    return NextResponse.json(
      {
        capability: 'suggestive_video_generation',
        executed: false,
        error: 'Internal server error during suggestive video generation',
      },
      { status: 500 },
    );
  }
}
