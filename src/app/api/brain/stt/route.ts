import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/brain/stt — Speech-to-Text endpoint
 *
 * Multi-provider support:
 *   - Groq STT (low-cost, fast — whisper-large-v3 / distil-whisper-large-v3-en / whisper-large-v3-turbo)
 *   - OpenAI STT (premium — whisper-1)
 *   - Gemini STT (premium multimodal — gemini-2.0-flash-live-001)
 *   - HuggingFace STT (free fallback — openai/whisper-large-v3 / openai/whisper-small)
 *
 * Accepts multipart/form-data with:
 *   - file (audio file, required) — audio to transcribe
 *   - model (string, optional) — Whisper model (default: auto-selected by provider)
 *   - language (string, optional) — ISO language code
 *   - provider (string, optional) — 'groq' | 'openai' | 'gemini' | 'huggingface' | 'auto' (default: 'auto')
 *
 * Returns:
 *   { transcript, model, language, provider, executed: true }
 *   or { error, executed: false } on failure.
 *
 * STRICT RULE: Never fakes success. Returns error if no provider configured.
 */

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data with an audio file', executed: false },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'An audio file is required in the "file" field', executed: false },
        { status: 400 },
      );
    }

    const requestedModel = formData.get('model') as string | null;
    const language = formData.get('language') as string | null;
    const requestedProvider = (formData.get('provider') as string | null) ?? 'auto';

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const hfKey = process.env.HUGGINGFACE_API_KEY;

    // Determine provider
    let provider: 'groq' | 'openai' | 'gemini' | 'huggingface';
    if (requestedProvider === 'groq') {
      if (!groqKey) {
        return NextResponse.json(
          { error: 'Groq STT requested but GROQ_API_KEY is not configured.', executed: false, provider: 'groq', capability: 'voice_input' },
          { status: 503 },
        );
      }
      provider = 'groq';
    } else if (requestedProvider === 'openai') {
      if (!openaiKey) {
        return NextResponse.json(
          { error: 'OpenAI STT requested but OPENAI_API_KEY is not configured.', executed: false, provider: 'openai', capability: 'voice_input' },
          { status: 503 },
        );
      }
      provider = 'openai';
    } else if (requestedProvider === 'gemini') {
      if (!geminiKey) {
        return NextResponse.json(
          { error: 'Gemini STT requested but GEMINI_API_KEY is not configured.', executed: false, provider: 'gemini', capability: 'voice_input' },
          { status: 503 },
        );
      }
      provider = 'gemini';
    } else if (requestedProvider === 'huggingface') {
      if (!hfKey) {
        return NextResponse.json(
          { error: 'HuggingFace STT requested but HUGGINGFACE_API_KEY is not configured.', executed: false, provider: 'huggingface', capability: 'voice_input' },
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
          { error: 'No STT provider configured. Set GROQ_API_KEY (low cost), OPENAI_API_KEY (premium), GEMINI_API_KEY (multimodal), or HUGGINGFACE_API_KEY (free fallback) to enable voice input.', executed: false, capability: 'voice_input' },
          { status: 503 },
        );
      }
    }

    // Select model
    const model = requestedModel
      ?? (provider === 'groq' ? 'whisper-large-v3' : provider === 'gemini' ? 'gemini-2.0-flash-live-001' : provider === 'huggingface' ? 'openai/whisper-large-v3' : 'whisper-1');

    if (provider === 'groq') {
      // Groq STT via OpenAI-compatible endpoint
      const upstream = new FormData();
      upstream.append('file', file, 'audio.webm');
      upstream.append('model', model);
      if (language) upstream.append('language', language);

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}` },
        body: upstream,
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: 'Groq transcription failed', detail: err, executed: false, provider: 'groq', model },
          { status: response.status },
        );
      }

      const result = await response.json();
      return NextResponse.json({
        transcript: result.text,
        model,
        language,
        provider: 'groq',
        executed: true,
        fallback_used: false,
        capability: 'voice_input',
      });
    }

    if (provider === 'gemini') {
      // Gemini STT via Google Generative Language API
      const audioBytes = Buffer.from(await file.arrayBuffer());
      const audioBase64 = audioBytes.toString('base64');
      const mimeType = (file as File).type || 'audio/webm';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: audioBase64 } },
                  { text: language ? `Transcribe this audio. The language is ${language}.` : 'Transcribe this audio accurately.' },
                ],
              },
            ],
            generationConfig: { temperature: 0, maxOutputTokens: 8192 },
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: 'Gemini transcription failed', detail: err, executed: false, provider: 'gemini', model },
          { status: response.status },
        );
      }

      const result = await response.json();
      const transcript = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return NextResponse.json({
        transcript,
        model,
        language,
        provider: 'gemini',
        executed: true,
        fallback_used: false,
        capability: 'voice_input',
      });
    }

    if (provider === 'huggingface') {
      // HuggingFace Inference API — free fallback STT
      const ALLOWED_HF_STT_MODELS = ['openai/whisper-large-v3', 'openai/whisper-small', 'openai/whisper-base'];
      const hfModel = ALLOWED_HF_STT_MODELS.includes(model) ? model : 'openai/whisper-large-v3';
      const audioBytes = Buffer.from(await file.arrayBuffer());

      const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfKey}`,
          'Content-Type': (file as File).type || 'audio/webm',
        },
        body: audioBytes,
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: 'HuggingFace transcription failed', detail: err, executed: false, provider: 'huggingface', model: hfModel },
          { status: response.status },
        );
      }

      const result = await response.json();
      return NextResponse.json({
        transcript: result.text ?? '',
        model: hfModel,
        language,
        provider: 'huggingface',
        executed: true,
        fallback_used: true,
        capability: 'voice_input',
      });
    }

    // OpenAI STT (premium path)
    const upstream = new FormData();
    upstream.append('file', file, 'audio.webm');
    upstream.append('model', model);
    if (language) upstream.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: upstream,
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: 'OpenAI transcription failed', detail: err, executed: false, provider: 'openai', model },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json({
      transcript: result.text,
      model,
      language,
      provider: 'openai',
      executed: true,
      fallback_used: false,
      capability: 'voice_input',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err), executed: false },
      { status: 500 },
    );
  }
}
