import { z } from 'zod';

// Ghost configuration schema
export const GhostConfigSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  version: z.string()
});

export type GhostConfig = z.infer<typeof GhostConfigSchema>;

// Meilisearch configuration schema
export const MeilisearchConfigSchema = z.object({
  host: z.string().url(),
  apiKey: z.string(),
  timeout: z.number().optional().default(5000)
});

export type MeilisearchConfig = z.infer<typeof MeilisearchConfigSchema>;

// Index field schema
export const IndexFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'string[]', 'number[]']),
  searchable: z.boolean().optional().default(false),
  filterable: z.boolean().optional().default(false),
  sortable: z.boolean().optional().default(false),
  displayed: z.boolean().optional().default(true)
});

export type IndexField = z.infer<typeof IndexFieldSchema>;

// Index configuration schema
export const IndexConfigSchema = z.object({
  name: z.string(),
  primaryKey: z.string().default('id'),
  fields: z.array(IndexFieldSchema).optional().default([])
});

export type IndexConfig = z.infer<typeof IndexConfigSchema>;

// Main configuration schema
export const ConfigSchema = z.object({
  ghost: GhostConfigSchema,
  meilisearch: MeilisearchConfigSchema,
  index: IndexConfigSchema
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from a JSON file
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    // Read the file using fs
    const fs = await import('fs/promises');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    return validateConfig(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate configuration object against the schema
 */
export function validateConfig(config: unknown): Config {
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Invalid configuration:\n${issues}`);
    }
    throw error;
  }
}
