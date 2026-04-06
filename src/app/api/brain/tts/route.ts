import { NextRequest, NextResponse } from 'next/server';
import { getVaultApiKey } from '@/lib/brain';

/**
 * POST /api/brain/tts — Text-to-Speech endpoint
 *
 * Multi-provider support:
 *   - Groq TTS (low-cost, fast — playai-tts / playai-tts-arabic)
 *   - OpenAI TTS (premium — tts-1 / tts-1-hd)
 *   - Gemini TTS (premium multimodal — gemini-2.5-flash-preview-tts)
 *   - HuggingFace TTS (free fallback — facebook/mms-tts-eng / facebook/mms-tts-fra)
 *
 * API keys are resolved from the DB vault first, then env var fallback.
 *
 * Accepts a JSON body with:
 *   - text (string, required) — the text to synthesise
 *   - voiceId (string, optional) — voice identifier (default: provider-specific)
 *   - gender (string, optional) — 'male' | 'female' — maps to a default voice for the provider
 *   - accent (string, optional) — accent hint used for model/voice selection
 *   - model (string, optional) — TTS model (default: auto-selected by provider)
 *   - speed (number, optional) — playback speed 0.25–4.0 (default: 1.0)
 *   - provider (string, optional) — 'groq' | 'openai' | 'gemini' | 'huggingface' | 'auto' (default: 'auto')
 *
 * Returns audio/mpeg stream on success.
 *
 * STRICT RULE: Never fakes success. Returns error if no provider configured.
 */

/** Default voice mappings per provider and gender */
const VOICE_BY_GENDER: Record<string, { male: string; female: string; default: string }> = {
  groq: {
    male:    'Atlas-PlayAI',
    female:  'Arista-PlayAI',
    default: 'Arista-PlayAI',
  },
  openai: {
    male:    'onyx',
    female:  'nova',
    default: 'alloy',
  },
  gemini: {
    male:    'Charon',
    female:  'Kore',
    default: 'Kore',
  },
  huggingface: {
    male:    'facebook/mms-tts-eng',
    female:  'facebook/mms-tts-eng',
    default: 'facebook/mms-tts-eng',
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      voiceId,
      gender,
      accent,
      model: requestedModel,
      speed = 1.0,
      provider: requestedProvider = 'auto',
    } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required and must be a non-empty string', executed: false },
        { status: 400 },
      );
    }

    // Resolve API keys from DB vault (with env fallback)
    const groqKey  = await getVaultApiKey('groq');
    const openaiKey = await getVaultApiKey('openai');
    const geminiKey = await getVaultApiKey('gemini');
    const hfKey    = await getVaultApiKey('huggingface');

    // Determine provider
    let provider: 'groq' | 'openai' | 'gemini' | 'huggingface';
    if (requestedProvider === 'groq') {
      if (!groqKey) {
        return NextResponse.json(
          { error: 'Groq TTS requested but no Groq API key is configured. Add it via Admin → AI Providers.', executed: false, provider: 'groq', capability: 'voice_output' },
          { status: 503 },
        );
      }
      provider = 'groq';
    } else if (requestedProvider === 'openai') {
      if (!openaiKey) {
        return NextResponse.json(
          { error: 'OpenAI TTS requested but no OpenAI API key is configured. Add it via Admin → AI Providers.', executed: false, provider: 'openai', capability: 'voice_output' },
          { status: 503 },
        );
      }
      provider = 'openai';
    } else if (requestedProvider === 'gemini') {
      if (!geminiKey) {
        return NextResponse.json(
          { error: 'Gemini TTS requested but no Gemini API key is configured. Add it via Admin → AI Providers.', executed: false, provider: 'gemini', capability: 'voice_output' },
          { status: 503 },
        );
      }
      provider = 'gemini';
    } else if (requestedProvider === 'huggingface') {
      if (!hfKey) {
        return NextResponse.json(
          { error: 'HuggingFace TTS requested but no HuggingFace API key is configured. Add it via Admin → AI Providers.', executed: false, provider: 'huggingface', capability: 'voice_output' },
          { status: 503 },
        );
      }
      provider = 'huggingface';
    } else {
      // Auto: prefer Groq (low-cost, fast), fallback to OpenAI, then Gemini, then HuggingFace
      if (groqKey) {
        provider = 'groq';
      } else if (openaiKey) {
        provider = 'openai';
      } else if (geminiKey) {
        provider = 'gemini';
      } else if (hfKey) {
        provider = 'huggingface';
      } else {
        return NextResponse.json(
          {
            error: 'No TTS provider configured. Add an API key via Admin → AI Providers. Supported providers: Groq (low cost), OpenAI (premium), Gemini (multimodal), HuggingFace (free fallback).',
            executed: false,
            capability: 'voice_output',
          },
          { status: 503 },
        );
      }
    }

    // Resolve the effective voice ID based on gender preference (if no explicit voiceId given)
    const resolveVoice = (prov: string): string => {
      if (voiceId) return voiceId;
      const map = VOICE_BY_GENDER[prov];
      if (!map) return '';
      if (gender === 'male') return map.male;
      if (gender === 'female') return map.female;
      return map.default;
    };

    if (provider === 'groq') {
      // Groq TTS via OpenAI-compatible endpoint
      const model = requestedModel ?? (accent === 'arabic' ? 'playai-tts-arabic' : 'playai-tts');
      const voice = resolveVoice('groq');

      const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: 'Groq TTS generation failed', detail: err, executed: false, provider: 'groq', model },
          { status: response.status },
        );
      }

      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.byteLength),
          'X-Provider': 'groq',
          'X-Model': model,
        },
      });
    }

    if (provider === 'gemini') {
      // Gemini TTS via Google Generative Language API
      const model = requestedModel ?? 'gemini-2.5-flash-preview-tts';
      const voice = resolveVoice('gemini');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: 'Gemini TTS generation failed', detail: err, executed: false, provider: 'gemini', model },
          { status: response.status },
        );
      }

      const result = await response.json();
      const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        return NextResponse.json(
          { error: 'Gemini TTS returned no audio data', executed: false, provider: 'gemini', model },
          { status: 502 },
        );
      }

      const audioBuffer = Buffer.from(audioData, 'base64');
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.byteLength),
          'X-Provider': 'gemini',
          'X-Model': model,
        },
      });
    }

    if (provider === 'huggingface') {
      // HuggingFace Inference API — free fallback TTS
      const ALLOWED_HF_TTS_MODELS = ['facebook/mms-tts-eng', 'facebook/mms-tts-fra'] as const;
      const matched = ALLOWED_HF_TTS_MODELS.find((m) => m === requestedModel);
      const hfModel = matched ?? 'facebook/mms-tts-eng';

      const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: 'HuggingFace TTS generation failed', detail: err, executed: false, provider: 'huggingface', model: hfModel },
          { status: response.status },
        );
      }

      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.byteLength),
          'X-Provider': 'huggingface',
          'X-Model': hfModel,
        },
      });
    }

    // OpenAI TTS (premium path)
    const model = requestedModel ?? 'tts-1';
    const voice = resolveVoice('openai');

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: 'OpenAI TTS generation failed', detail: err, executed: false, provider: 'openai', model },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'X-Provider': 'openai',
        'X-Model': model,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err), executed: false },
      { status: 500 },
    );
  }
}
