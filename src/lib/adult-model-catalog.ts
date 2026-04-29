/**
 * Adult Creative Model Catalog
 *
 * These Hugging Face models come from DavidAU's roleplay / creative-writing /
 * uncensored collection. They are text-generation models for adult creative
 * writing and roleplay only. They do not provide image or video generation.
 *
 * Most entries are GGUF repositories. GGUF models generally require a private
 * Hugging Face Inference Endpoint, llama.cpp/Ollama/vLLM-style runtime, or a
 * custom OpenAI-compatible endpoint. The public HF Inference API may not serve
 * them directly.
 */

export type AdultModelRuntime =
  | 'huggingface_inference_api'
  | 'huggingface_private_endpoint'
  | 'local_gguf_runtime'

export interface AdultTextModelSpec {
  id: string
  label: string
  family: 'Gemma' | 'Llama' | 'Mistral' | 'Qwen' | 'DeepSeek' | 'Command-R' | 'Other'
  parametersB: number
  source: 'DavidAU Hugging Face collection'
  sourceUrl: string
  runtime: AdultModelRuntime[]
  notes: string
  preferred?: boolean
}

export interface AdultImageModelSpec {
  id: string
  label: string
  source: 'Hugging Face NSFW search' | 'Existing adult image catalog'
  sourceUrl: string
  runtime: Extract<AdultModelRuntime, 'huggingface_inference_api' | 'huggingface_private_endpoint'>[]
  steps: number
  cfgScale: number
  notes: string
  preferred?: boolean
}

export interface AdultVideoModelSpec {
  id: string
  label: string
  source: 'Hugging Face NSFW search'
  sourceUrl: string
  runtime: Extract<AdultModelRuntime, 'huggingface_private_endpoint' | 'local_gguf_runtime'>[]
  notes: string
  experimental: true
}

export const DAVIDAU_ADULT_COLLECTION_URL =
  'https://huggingface.co/collections/DavidAU/200-roleplay-creative-writing-uncensored-nsfw-models'

export const HUGGINGFACE_NSFW_SEARCH_URL = 'https://huggingface.co/models?search=nsfw'

export const ADULT_IMAGE_MODELS: readonly AdultImageModelSpec[] = [
  {
    id: 'SG161222/RealVisXL_V4.0',
    label: 'RealVisXL v4',
    source: 'Existing adult image catalog',
    sourceUrl: 'https://huggingface.co/SG161222/RealVisXL_V4.0',
    runtime: ['huggingface_inference_api', 'huggingface_private_endpoint'],
    steps: 30,
    cfgScale: 7.0,
    notes: 'Photorealistic SDXL baseline. Requires provider/model access.',
    preferred: true,
  },
  {
    id: 'Lykon/dreamshaper-8',
    label: 'DreamShaper 8',
    source: 'Existing adult image catalog',
    sourceUrl: 'https://huggingface.co/Lykon/dreamshaper-8',
    runtime: ['huggingface_inference_api', 'huggingface_private_endpoint'],
    steps: 25,
    cfgScale: 7.0,
    notes: 'Versatile image generation fallback.',
  },
  {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    label: 'SDXL Base',
    source: 'Existing adult image catalog',
    sourceUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0',
    runtime: ['huggingface_inference_api', 'huggingface_private_endpoint'],
    steps: 30,
    cfgScale: 7.5,
    notes: 'General SDXL fallback.',
  },
  {
    id: 'diroverflo/FLux_Klein_9B_NSFW',
    label: 'FLux Klein 9B NSFW',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    steps: 28,
    cfgScale: 6.5,
    notes: 'Text-to-image NSFW result from Hugging Face search. Private endpoint recommended.',
    preferred: true,
  },
  {
    id: 'Heartsync/Flux-NSFW-uncensored',
    label: 'Flux NSFW Uncensored',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    steps: 28,
    cfgScale: 6.5,
    notes: 'Text-to-image NSFW result. Requires testing before enabling.',
  },
  {
    id: 'xey/sldr_flux_nsfw_v2-studio',
    label: 'SLDR Flux NSFW v2 Studio',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    steps: 28,
    cfgScale: 6.5,
    notes: 'Text-to-image Flux NSFW result. Private endpoint recommended.',
  },
  {
    id: 'UnfilteredAI/NSFW-gen-v2',
    label: 'NSFW Gen v2',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    steps: 28,
    cfgScale: 7.0,
    notes: 'Text-to-image NSFW result from Hugging Face search.',
  },
  {
    id: 'CultriX/flux-nsfw-highress',
    label: 'Flux NSFW Highres',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    steps: 30,
    cfgScale: 6.5,
    notes: 'Flux text-to-image NSFW result.',
  },
  {
    id: 'lustlyai/Flux_Lustly.ai_Uncensored_nsfw_v1',
    label: 'Flux Lustly Uncensored v1',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    steps: 30,
    cfgScale: 6.5,
    notes: 'Flux text-to-image NSFW result. Requires endpoint access and generation test.',
  },
] as const

export const ADULT_VIDEO_MODELS: readonly AdultVideoModelSpec[] = [
  {
    id: 'NSFW-API/NSFW_Wan_14b',
    label: 'NSFW Wan 14B',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    notes: 'Video-related result from search. Requires a specialist video endpoint before routing.',
    experimental: true,
  },
  {
    id: 'lynaNSFW/LTX2.3_NSFW_motion',
    label: 'LTX 2.3 NSFW Motion',
    source: 'Hugging Face NSFW search',
    sourceUrl: HUGGINGFACE_NSFW_SEARCH_URL,
    runtime: ['huggingface_private_endpoint'],
    notes: 'Motion/video-related result. Treat as experimental until endpoint contract is known.',
    experimental: true,
  },
] as const

export const ADULT_TEXT_MODELS: readonly AdultTextModelSpec[] = [
  {
    id: 'DavidAU/Gemma-The-Writer-N-Restless-Quill-10B-Uncensored-GGUF',
    label: 'Gemma Writer Restless Quill 10B Uncensored',
    family: 'Gemma',
    parametersB: 10,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Creative writing / prose model. GGUF runtime recommended.',
    preferred: true,
  },
  {
    id: 'DavidAU/Gemma-The-Writer-N-Restless-Quill-V2-Enhanced32-10B-Uncensored-GGUF',
    label: 'Gemma Writer Restless Quill V2 Enhanced32 10B',
    family: 'Gemma',
    parametersB: 10,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Updated creative-writing model from the same collection.',
    preferred: true,
  },
  {
    id: 'DavidAU/L3.2-Rogue-Creative-Instruct-Uncensored-Abliterated-7B-GGUF',
    label: 'Llama 3.2 Rogue Creative 7B Abliterated',
    family: 'Llama',
    parametersB: 8,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Fast creative roleplay model. GGUF runtime required for reliable execution.',
    preferred: true,
  },
  {
    id: 'DavidAU/L3.2-Rogue-Creative-Instruct-Uncensored-7B-GGUF',
    label: 'Llama 3.2 Rogue Creative 7B Uncensored',
    family: 'Llama',
    parametersB: 8,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Smaller adult creative-writing fallback.',
  },
  {
    id: 'DavidAU/L3.1-Dark-Planet-SpinFire-Uncensored-8B-GGUF',
    label: 'Llama 3.1 Dark Planet SpinFire 8B',
    family: 'Llama',
    parametersB: 8,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Creative / roleplay model with uncensored tuning.',
  },
  {
    id: 'DavidAU/L3.1-RP-Hero-Dirty_Harry-8B-GGUF',
    label: 'Llama 3.1 RP Hero Dirty Harry 8B',
    family: 'Llama',
    parametersB: 8,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Roleplay-focused model.',
  },
  {
    id: 'DavidAU/L3.1-RP-Hero-BigTalker-8B-GGUF',
    label: 'Llama 3.1 RP Hero BigTalker 8B',
    family: 'Llama',
    parametersB: 8,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Roleplay and long dialogue model.',
  },
  {
    id: 'DavidAU/L3-Dark_Mistress-The_Guilty_Pen-Uncensored-17.4B-GGUF',
    label: 'Llama 3 Dark Mistress Guilty Pen 17B',
    family: 'Llama',
    parametersB: 17,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Larger fiction / roleplay model.',
  },
  {
    id: 'DavidAU/Mistral-MOE-4X7B-Dark-MultiVerse-Uncensored-Enhanced32-24B-gguf',
    label: 'Mistral MOE Dark MultiVerse 24B Uncensored',
    family: 'Mistral',
    parametersB: 24,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'MOE creative model. Heavier runtime requirements.',
    preferred: true,
  },
  {
    id: 'DavidAU/DeepSeek-V2-Grand-Horror-SMB-R1-Distill-Llama-3.1-Uncensored-16.5B-GGUF',
    label: 'DeepSeek Grand Horror SMB R1 16.5B Uncensored',
    family: 'DeepSeek',
    parametersB: 17,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Reasoning-style creative fiction model.',
  },
  {
    id: 'DavidAU/Llama-3.2-8X4B-MOE-V2-Dark-Champion-Instruct-uncensored-abliterated-21B-GGUF',
    label: 'Llama Dark Champion MOE 21B Abliterated',
    family: 'Llama',
    parametersB: 21,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Popular MOE creative model. Heavier runtime requirements.',
    preferred: true,
  },
  {
    id: 'DavidAU/Llama-3.1-128k-Dark-Planet-Uncensored-8B-GGUF',
    label: 'Llama 3.1 Dark Planet 128K 8B',
    family: 'Llama',
    parametersB: 8,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Long-context creative roleplay option.',
  },
  {
    id: 'DavidAU/Qwen3-The-Josiefied-Omega-Directive-22B-uncensored-abliterated-GGUF',
    label: 'Qwen3 Josiefied Omega Directive 22B',
    family: 'Qwen',
    parametersB: 22,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Qwen-family uncensored creative model.',
  },
  {
    id: 'DavidAU/Qwen3-18B-A3B-Stranger-Thoughts-Abliterated-Uncensored-GGUF',
    label: 'Qwen3 Stranger Thoughts A3B 18B',
    family: 'Qwen',
    parametersB: 17,
    source: 'DavidAU Hugging Face collection',
    sourceUrl: DAVIDAU_ADULT_COLLECTION_URL,
    runtime: ['huggingface_private_endpoint', 'local_gguf_runtime'],
    notes: 'Creative / reasoning model from the collection.',
  },
] as const

export function getAdultTextModels(): readonly AdultTextModelSpec[] {
  return ADULT_TEXT_MODELS
}

export function getAdultImageModels(): readonly AdultImageModelSpec[] {
  return ADULT_IMAGE_MODELS
}

export function getAdultVideoModels(): readonly AdultVideoModelSpec[] {
  return ADULT_VIDEO_MODELS
}

export function getPreferredAdultTextModels(): readonly AdultTextModelSpec[] {
  return ADULT_TEXT_MODELS.filter((model) => model.preferred)
}

export function getAdultTextModel(modelId: string): AdultTextModelSpec | undefined {
  return ADULT_TEXT_MODELS.find((model) => model.id === modelId)
}

export function getDefaultAdultTextModel(): AdultTextModelSpec {
  return getPreferredAdultTextModels()[0] ?? ADULT_TEXT_MODELS[0]
}

export function getDefaultAdultImageModel(): AdultImageModelSpec {
  return ADULT_IMAGE_MODELS.find((model) => model.preferred) ?? ADULT_IMAGE_MODELS[0]
}
