import { createGoogleGenerativeAI, type GoogleEmbeddingModelOptions } from '@ai-sdk/google';
import { Inject, Injectable } from '@nestjs/common';
import { createProviderRegistry, embedMany, type LanguageModel } from 'ai';
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
  private readonly registry: ReturnType<typeof createRegistry>;

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
    this.registry = createRegistry(this.google);
  }

  /** Resolves a `provider:model` reference (validated by the env schema). */
  languageModel(ref: string): LanguageModel {
    return this.registry.languageModel(ref as `google:${string}`);
  }

  get summaryModel(): LanguageModel | null {
    return this.env.SUMMARY_MODEL ? this.languageModel(this.env.SUMMARY_MODEL) : null;
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

function createRegistry(google: ReturnType<typeof createGoogleGenerativeAI>) {
  return createProviderRegistry({ google });
}
