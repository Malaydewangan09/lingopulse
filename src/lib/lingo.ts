export async function validateLingoApiKey(apiKey: string): Promise<void> {
  const normalized = apiKey.trim();
  if (!normalized) {
    throw new Error('Lingo.dev API key is required');
  }

  try {
    const { LingoDotDevEngine } = await import('@lingo.dev/_sdk');
    const engine = new LingoDotDevEngine({ apiKey: normalized });
    const translated = await engine.localizeObject(
      { healthcheck: 'Good morning' },
      { sourceLocale: 'en', targetLocale: 'es' },
    ) as Record<string, string>;

    if (!translated.healthcheck?.trim()) {
      throw new Error('Empty validation response');
    }
  } catch {
    throw new Error('Invalid Lingo.dev API key. Update it and try again.');
  }
}
