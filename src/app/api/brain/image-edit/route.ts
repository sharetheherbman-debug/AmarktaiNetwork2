/**
 * POST /api/brain/image-edit — Image editing (inpainting / instruction-based editing)
 *
 * Edit an existing image by describing the change you want.
 * Supports mask-based inpainting (OpenAI DALL-E 2) and instruction-based
 * editing via HuggingFace Stable Diffusion Inpainting models.
 *
 * PROVIDERS (in order):
 *   1. OpenAI DALL-E 2 `/v1/images/edits` — requires image + optional mask PNG ≤ 4 MB square
 *   2. HuggingFace `runwayml/stable-diffusion-inpainting` — mask-based diffusion inpainting
 *   3. HuggingFace `stabilityai/stable-diffusion-2-inpainting` — SD 2.x inpainting fallback
 *
 * Accepts JSON body:
 *   - prompt   (string, required)  — description of the desired edit
 *   - image    (string, required)  — base64-encoded PNG image
 *                                    (with or without `data:image/png;base64,` prefix)
 *   - mask     (string, optional)  — base64-encoded PNG mask
 *                                    (white = area to edit, black = keep as-is)
 *                                    If omitted, entire image is eligible for editing.
 *   - size     (string, optional)  — '256x256' | '512x512' | '1024x1024' (default: '1024x1024')
 *
 * Returns:
 *   { executed, imageUrl?, imageBase64?, provider, model, size, promptUsed }
 *
 * Error codes:
 *   - image_required          — no image supplied in request body
 *   - invalid_image_format    — image data is not valid base64 PNG
 *   - no_eligible_edit_model  — no edit-capable provider is configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVaultApiKey } from '@/lib/brain';

const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024'] as const;
type EditSize = (typeof ALLOWED_SIZES)[number];

/** Maximum image size accepted by the OpenAI DALL-E 2 images/edits endpoint (4 MB). */
const DALLE2_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Strip the data-URI prefix, if present, and return a raw base64 string. */
function stripDataUri(b64: string): string {
  const idx = b64.indexOf(',');
  return idx !== -1 ? b64.slice(idx + 1) : b64;
}

/** Convert a raw base64 string to a Node.js Buffer. */
function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(stripDataUri(b64), 'base64');
}

/**
 * HuggingFace inpainting models tried in preference order.
 * These models accept `inputs` (source image) and `parameters.mask_image` (mask).
 */
const HF_INPAINT_MODELS = [
  'runwayml/stable-diffusion-inpainting',
  'stabilityai/stable-diffusion-2-inpainting',
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      image: imageB64,
      mask: maskB64,
      size = '1024x1024',
    } = body as {
      prompt?: string;
      image?: string;
      mask?: string;
      size?: string;
    };

    // ── Validate prompt ──────────────────────────────────────────────────
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // ── Validate image ───────────────────────────────────────────────────
    if (!imageB64 || typeof imageB64 !== 'string' || imageB64.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'image is required for image editing. Provide a base64-encoded PNG image.',
          code: 'image_required',
          hint: 'Include the original image as a base64 PNG in the "image" field.',
        },
        { status: 400 },
      );
    }

    let imageBuffer: Buffer;
    try {
      imageBuffer = b64ToBuffer(imageB64);
      if (imageBuffer.length === 0) throw new Error('empty');
    } catch {
      return NextResponse.json(
        { error: 'Invalid image: could not decode base64 data.', code: 'invalid_image_format' },
        { status: 400 },
      );
    }

    const resolvedSize: EditSize = ALLOWED_SIZES.includes(size as EditSize)
      ? (size as EditSize)
      : '1024x1024';

    // ── Provider 1: OpenAI DALL-E 2 (images/edits) ─────────────────────
    const openaiKey = await getVaultApiKey('openai');
    if (openaiKey) {
      try {
        // DALL-E 2 edits endpoint requires a PNG file ≤ 4 MB
        if (imageBuffer.length <= DALLE2_MAX_IMAGE_BYTES) {
          const form = new FormData();
          form.append('model', 'dall-e-2');
          form.append('prompt', prompt.trim());
          form.append('n', '1');
          form.append('size', resolvedSize);
          form.append(
            'image',
            new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }),
            'image.png',
          );

          // Mask is optional; if provided, restrict edits to the masked region
          if (maskB64) {
            try {
              const maskBuffer = b64ToBuffer(maskB64);
              if (maskBuffer.length > 0) {
                form.append(
                  'mask',
                  new Blob([new Uint8Array(maskBuffer)], { type: 'image/png' }),
                  'mask.png',
                );
              }
            } catch {
              // Ignore invalid mask — proceed without it
            }
          }

          const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openaiKey}`,
            },
            body: form,
            signal: AbortSignal.timeout(90_000),
          });

          if (response.ok) {
            const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
            const imageUrl = data.data?.[0]?.url ?? null;
            const imageBase64 = data.data?.[0]?.b64_json
              ? `data:image/png;base64,${data.data[0].b64_json}`
              : null;
            if (imageUrl || imageBase64) {
              return NextResponse.json({
                executed: true,
                imageUrl,
                imageBase64,
                provider: 'openai',
                model: 'dall-e-2',
                size: resolvedSize,
                promptUsed: prompt.trim(),
              });
            }
          } else {
            const errBody = await response.json().catch(() => ({})) as { error?: { message?: string } };
            const errMsg = errBody?.error?.message ?? String(response.status);
            console.warn(`[brain/image-edit] OpenAI dall-e-2 failed: ${errMsg}`);
          }
        } else {
          console.warn('[brain/image-edit] Image exceeds DALL-E 2 limit (4 MB); skipping OpenAI');
        }
      } catch (err) {
        console.warn('[brain/image-edit] OpenAI error:', err instanceof Error ? err.message : err);
      }
    }

    // ── Provider 2: HuggingFace Stable Diffusion Inpainting ────────────
    const hfKey = await getVaultApiKey('huggingface');
    if (hfKey) {
      // Convert source image and optional mask to base64 strings for HF API
      const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      const maskDataUrl = maskB64
        ? (() => {
            try {
              const mb = b64ToBuffer(maskB64);
              return mb.length > 0 ? `data:image/png;base64,${mb.toString('base64')}` : null;
            } catch {
              return null;
            }
          })()
        : null;

      for (const hfModel of HF_INPAINT_MODELS) {
        try {
          const hfBody: Record<string, unknown> = {
            inputs: imageDataUrl,
            parameters: {
              prompt: prompt.trim(),
              num_inference_steps: 25,
              guidance_scale: 7.5,
            },
          };

          if (maskDataUrl) {
            (hfBody.parameters as Record<string, unknown>).mask_image = maskDataUrl;
          }

          const response = await fetch(
            `https://api-inference.huggingface.co/models/${hfModel}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${hfKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(hfBody),
              signal: AbortSignal.timeout(120_000),
            },
          );

          if (response.ok) {
            const contentType = response.headers.get('content-type') ?? 'image/png';
            const buffer = await response.arrayBuffer();
            if (buffer.byteLength > 0) {
              const base64 = Buffer.from(buffer).toString('base64');
              const imageBase64 = `data:${contentType};base64,${base64}`;
              return NextResponse.json({
                executed: true,
                imageBase64,
                provider: 'huggingface',
                model: hfModel,
                size: resolvedSize,
                promptUsed: prompt.trim(),
              });
            }
          } else {
            const errText = await response.text().catch(() => '');
            console.warn(`[brain/image-edit] HuggingFace ${hfModel} failed (${response.status}): ${errText.slice(0, 200)}`);
            // 503 means model is loading — try next model
            if (response.status !== 503) break;
          }
        } catch (hfErr) {
          console.warn(
            `[brain/image-edit] HuggingFace ${hfModel} error:`,
            hfErr instanceof Error ? hfErr.message : hfErr,
          );
        }
      }
    }

    // ── No provider available ────────────────────────────────────────────
    const rejectionReasons: string[] = [];
    if (!openaiKey) rejectionReasons.push('openai: no API key configured (needed for DALL-E 2 inpainting)');
    if (!hfKey) rejectionReasons.push('huggingface: no API key configured (needed for SD inpainting)');

    return NextResponse.json(
      {
        executed: false,
        capability: 'image_editing',
        code: 'no_eligible_edit_model',
        error:
          'No image editing provider is configured. ' +
          'Add an OpenAI API key for DALL-E 2 inpainting, or a HuggingFace key for ' +
          'Stable Diffusion Inpainting (runwayml/stable-diffusion-inpainting).',
        providers_checked: ['openai', 'huggingface'],
        rejection_reasons: rejectionReasons,
      },
      { status: 503 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err), executed: false },
      { status: 500 },
    );
  }
}
