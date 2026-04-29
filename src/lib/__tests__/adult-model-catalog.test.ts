import { describe, expect, it } from 'vitest'
import {
  DAVIDAU_ADULT_COLLECTION_URL,
  HUGGINGFACE_NSFW_SEARCH_URL,
  getAdultImageModels,
  getAdultTextModel,
  getAdultTextModels,
  getAdultVideoModels,
  getDefaultAdultTextModel,
  getPreferredAdultTextModels,
} from '@/lib/adult-model-catalog'

describe('adult-model-catalog', () => {
  it('catalogs DavidAU adult creative text models separately from image/video models', () => {
    const models = getAdultTextModels()

    expect(models.length).toBeGreaterThanOrEqual(10)
    expect(models.every((model) => model.sourceUrl === DAVIDAU_ADULT_COLLECTION_URL)).toBe(true)
    expect(models.every((model) => model.runtime.includes('local_gguf_runtime'))).toBe(true)
    expect(models.every((model) => model.notes.toLowerCase().includes('image'))).toBe(false)
  })

  it('has a deterministic preferred default model', () => {
    const preferred = getPreferredAdultTextModels()
    const defaultModel = getDefaultAdultTextModel()

    expect(preferred.length).toBeGreaterThan(0)
    expect(defaultModel.id).toBe('DavidAU/Gemma-The-Writer-N-Restless-Quill-10B-Uncensored-GGUF')
    expect(getAdultTextModel(defaultModel.id)).toEqual(defaultModel)
  })

  it('catalogs Hugging Face NSFW search image models separately from text models', () => {
    const models = getAdultImageModels()
    const hfSearchModels = models.filter((model) => model.sourceUrl === HUGGINGFACE_NSFW_SEARCH_URL)

    expect(models.length).toBeGreaterThanOrEqual(8)
    expect(hfSearchModels.map((model) => model.id)).toContain('diroverflo/FLux_Klein_9B_NSFW')
    expect(hfSearchModels.every((model) => model.runtime.includes('huggingface_private_endpoint'))).toBe(true)
  })

  it('keeps adult video candidates experimental until a specialist endpoint exists', () => {
    const models = getAdultVideoModels()

    expect(models.length).toBeGreaterThanOrEqual(2)
    expect(models.every((model) => model.experimental)).toBe(true)
    expect(models.map((model) => model.id)).toContain('NSFW-API/NSFW_Wan_14b')
  })
})
