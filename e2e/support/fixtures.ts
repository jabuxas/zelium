import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page, context }, use) => {
    const externas: string[] = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        externas.push(`${route.request().method()} ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });
    await use(page);
    expect(externas, 'E2E não pode acessar APIs ou assets externos ao ambiente isolado').toEqual([]);
  },
});

export { expect };
