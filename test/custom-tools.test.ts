import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorybookMCPServer } from '../src/server.js';

describe('Custom Tools Support', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should parse valid CUSTOM_TOOLS configuration', () => {
    const customTools = [
      {
        name: 'getIconList',
        description: 'Get All Icons from the Icon page',
        parameters: {},
        page: 'https://example.com/storybook/?path=/docs/icon--docs',
        handler: "Array.from(document.querySelectorAll('.icon-name')).map(i => i.textContent)",
      },
    ];

    process.env.STORYBOOK_URL = 'https://example.com/index.json';
    process.env.CUSTOM_TOOLS = JSON.stringify(customTools);

    expect(() => new StorybookMCPServer()).not.toThrow();
  });

  it('should handle invalid CUSTOM_TOOLS JSON gracefully', () => {
    process.env.STORYBOOK_URL = 'https://example.com/index.json';
    process.env.CUSTOM_TOOLS = 'invalid json';

    expect(() => new StorybookMCPServer()).not.toThrow();
  });

  it('should validate custom tool fields', () => {
    const invalidCustomTools = [
      {
        name: 'invalidTool',
        // Missing required fields
      },
      {
        name: 'anotherInvalidTool',
        description: 'Valid description',
        page: 'invalid-url',
        handler: 'valid handler code',
      },
    ];

    process.env.STORYBOOK_URL = 'https://example.com/index.json';
    process.env.CUSTOM_TOOLS = JSON.stringify(invalidCustomTools);

    expect(() => new StorybookMCPServer()).not.toThrow();
  });

  it('should handle missing CUSTOM_TOOLS environment variable', () => {
    process.env.STORYBOOK_URL = 'https://example.com/index.json';
    delete process.env.CUSTOM_TOOLS;

    expect(() => new StorybookMCPServer()).not.toThrow();
  });
});
