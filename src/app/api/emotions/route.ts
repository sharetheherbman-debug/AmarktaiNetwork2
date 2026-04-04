/**
 * Public API — Emotion Analysis Endpoint (v2)
 *
 * POST /api/emotions  — Analyse text for emotions
 * GET  /api/emotions  — Return available emotion types and model info
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  detectEmotions,
  analyzeSentiment,
  runEmotionPipeline,
  EMOTION_TYPES,
  EMOTION_MODELS,
  PERSONALITY_TYPES,
  EMOJI_EMOTION_COUNT,
  type PersonalityType,
} from '@/lib/emotion-engine'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, userId, basePersonality, fullPipeline } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text (string) is required' }, { status: 400 })
    }

    // Quick detection only
    if (!fullPipeline) {
      const analysis = detectEmotions(text)
      const sentiment = analyzeSentiment(text)
      return NextResponse.json({ success: true, analysis, sentiment })
    }

    // Full pipeline (needs userId)
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId (string) is required for fullPipeline' },
        { status: 400 },
      )
    }

    const result = runEmotionPipeline(
      userId,
      text,
      (basePersonality as PersonalityType) || 'professional',
    )

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Emotion analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    emotionTypes: EMOTION_TYPES,
    personalityTypes: PERSONALITY_TYPES,
    models: EMOTION_MODELS,
    version: 2,
    features: [
      'Multi-label emotion detection',
      'AFINN-165 NLP sentiment analysis',
      'Emoji emotion mapping (' + EMOJI_EMOTION_COUNT + ' emoji)',
      'Negation/sarcasm detection',
      'Intensity modifier scaling',
      'Emotion transition tracking',
      'Conversation context window',
      'Adaptive personality engine',
      'Behavioral learning loop',
    ],
    endpoints: {
      'POST /api/emotions': 'Analyse text (send { text, userId?, basePersonality?, fullPipeline? })',
      'GET  /api/emotions': 'Return available types, models, and features',
    },
  })
}
