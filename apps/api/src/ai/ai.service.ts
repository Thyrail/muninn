import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI, type GoogleEmbeddingModelOptions } from '@ai-sdk/google';
import { Inject, Injectable } from '@nestjs/common';
import { createProviderRegistry, embedMany, type LanguageModel, type SpeechModel } from 'ai';
import { API_ENV, type ApiEnv } from '../config/env.js';

/** Gemini accepts at most 100 texts per batch embedding request. */
export const EMBEDDING_BATCH_SIZE = 100;

type EmbeddingTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/**
 * Single entry point to LLM providers. Model IDs always come from the environment;
 * text models are addressed as `provider:model` through the AI SDK provider registry.
 */
@Injectable()
export class AiService {
  private readonly google: ReturnType<typeof createGoogleGenerativeAI>;
  private readonly registry: ReturnType<typeof createProviderRegistry>;

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
    this.registry = createProviderRegistry({
      google: this.google,
      anthropic: createAnthropic({ apiKey: env.ANTHROPIC_API_KEY }),
    });
  }

  /** Resolves a `provider:model` reference (validated by the env schema). */
  languageModel(ref: string): LanguageModel {
    return this.registry.languageModel(ref as `google:${string}`);
  }

  get chatModel(): LanguageModel {
    return this.languageModel(this.env.CHAT_MODEL);
  }

  get summaryModel(): LanguageModel | null {
    return this.env.SUMMARY_MODEL ? this.languageModel(this.env.SUMMARY_MODEL) : null;
  }

  /** Studio documents and the podcast script; falls back to the chat model. */
  get studioModel(): LanguageModel {
    return this.languageModel(this.env.STUDIO_MODEL ?? this.env.CHAT_MODEL);
  }

  /** Gemini multi-speaker text-to-speech, or null when the audio overview is disabled. */
  get speechModel(): SpeechModel | null {
    return this.env.TTS_MODEL ? this.google.speech(this.env.TTS_MODEL) : null;
  }

  get podcastVoices(): { hugin: string; munin: string } {
    return { hugin: this.env.TTS_VOICE_HUGIN, munin: this.env.TTS_VOICE_MUNIN };
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts, 'RETRIEVAL_DOCUMENT');
  }

  async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embed([text], 'RETRIEVAL_QUERY');
    if (!embedding) throw new Error('Embedding request returned no vector');
    return embedding;
  }

  private async embed(texts: string[], taskType: EmbeddingTask): Promise<number[][]> {
    const model = this.google.embedding(this.env.EMBEDDING_MODEL);
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += EMBEDDING_BATCH_SIZE) {
      const { embeddings } = await embedMany({
        model,
        values: texts.slice(start, start + EMBEDDING_BATCH_SIZE),
        maxRetries: 4,
        providerOptions: {
          google: {
            taskType,
            outputDimensionality: this.env.EMBEDDING_DIM,
          } satisfies GoogleEmbeddingModelOptions,
        },
      });
      vectors.push(...embeddings);
    }
    const wrong = vectors.find((vector) => vector.length !== this.env.EMBEDDING_DIM);
    if (wrong) {
      throw new Error(`Expected ${this.env.EMBEDDING_DIM} dimensions, got ${wrong.length}`);
    }
    return vectors;
  }
}
