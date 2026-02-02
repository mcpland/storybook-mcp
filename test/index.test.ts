import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPage, mockBrowser, mockChromiumLaunch } = vi.hoisted(() => {
  const page = {
    goto: vi.fn(),
    waitForSelector: vi.fn(),
    waitForTimeout: vi.fn(),
    $eval: vi.fn().mockResolvedValue('<tr><td>prop</td></tr>'),
    evaluate: vi.fn(),
    close: vi.fn(),
  };

  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn(),
  };

  const launch = vi.fn().mockResolvedValue(browser);

  return {
    mockPage: page,
    mockBrowser: browser,
    mockChromiumLaunch: launch,
  };
});

// Mock playwright before importing the server
vi.mock('playwright', () => {
  return {
    chromium: {
      launch: mockChromiumLaunch,
    },
  };
});

const resetPlaywrightMocks = () => {
  mockChromiumLaunch.mockClear();
  mockChromiumLaunch.mockResolvedValue(mockBrowser);
  mockBrowser.newPage.mockClear();
  mockBrowser.newPage.mockResolvedValue(mockPage);
  mockBrowser.close.mockClear();
  mockPage.goto.mockClear();
  mockPage.waitForSelector.mockClear();
  mockPage.waitForTimeout.mockClear();
  mockPage.$eval.mockClear();
  mockPage.$eval.mockResolvedValue('<tr><td>prop</td></tr>');
  mockPage.evaluate.mockClear();
  mockPage.evaluate.mockResolvedValue(undefined);
  mockPage.close.mockClear();
};

import { StorybookMCPServer } from '../src/server.js';

// mock fetch
import fetch from 'node-fetch';
globalThis.fetch = fetch as any;

describe('StorybookMCPServer', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...OLD_ENV,
      STORYBOOK_URL: 'http://localhost:6006/index.json',
    };
    // Reset all mocks
    vi.clearAllMocks();
    resetPlaywrightMocks();
  });

  it('should throw if STORYBOOK_URL is not set', () => {
    process.env.STORYBOOK_URL = '';
    expect(() => new StorybookMCPServer()).toThrow(/STORYBOOK_URL/);
  });

  it('should instantiate with STORYBOOK_URL', () => {
    expect(() => new StorybookMCPServer()).not.toThrow();
  });

  it('getComponentList should return unique sorted components for v3', async () => {
    const mockData = {
      v: 3,
      stories: {
        a: {
          id: 'button--primary',
          title: 'Button',
          name: 'Primary',
          importPath: 'src/Button.tsx',
          kind: 'Components/Button',
          story: 'Primary',
          parameters: {
            __id: 'a',
            docsOnly: false,
            fileName: 'src/Button.tsx',
          },
        },
        b: {
          id: 'input--default',
          title: 'Input',
          name: 'Default',
          importPath: 'src/Input.tsx',
          kind: 'Components/Input',
          story: 'Default',
          parameters: {
            __id: 'b',
            docsOnly: false,
            fileName: 'src/Input.tsx',
          },
        },
        c: {
          id: 'button--secondary',
          title: 'Button',
          name: 'Secondary',
          importPath: 'src/Button.tsx',
          kind: 'Components/Button',
          story: 'Secondary',
          parameters: {
            __id: 'c',
            docsOnly: false,
            fileName: 'src/Button.tsx',
          },
        },
        d: {
          id: 'other--docs',
          title: 'Other',
          name: 'Docs',
          importPath: 'src/Other.tsx',
          kind: 'Components/Other',
          story: 'Docs',
          parameters: {
            __id: 'd',
            docsOnly: true,
            fileName: 'src/Other.tsx',
          },
        },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentList();
    expect(result.content[0].text).toContain('Button');
    expect(result.content[0].text).toContain('Input');
    expect(result.content[0].text).not.toContain('Other');
  });

  it('getComponentsProps should return props table html for v3', async () => {
    const mockData = {
      v: 3,
      stories: {
        a: {
          id: 'button--primary',
          title: 'Button',
          name: 'Primary',
          importPath: 'src/Button.tsx',
          kind: 'Components/Button',
          story: 'Primary',
          parameters: {
            __id: 'a',
            docsOnly: false,
            fileName: 'src/Button.tsx',
          },
        },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentsProps(['Button']);
    expect(result.content[0].text).toContain('<tr><td>prop</td></tr>');
    expect(result.content[0].text).toContain('### Button');
  });

  it('getComponentList should return unique sorted components for v5', async () => {
    const mockData = {
      v: 5,
      entries: {
        a: { type: 'docs', title: 'Button' },
        b: { type: 'docs', title: 'Input' },
        c: { type: 'docs', title: 'Button' },
        d: { type: 'story', title: 'Other' },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentList();
    expect(result.content[0].text).toContain('Button');
    expect(result.content[0].text).toContain('Input');
    expect(result.content[0].text).not.toContain('Other');
  });

  it('getComponentsProps should return props table html for v5', async () => {
    const mockData = {
      v: 5,
      entries: {
        a: { type: 'docs', title: 'Button', id: 'button--docs' },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentsProps(['Button']);
    expect(result.content[0].text).toContain('<tr><td>prop</td></tr>');
    expect(result.content[0].text).toContain('### Button');
  });

  it('getComponentsProps should handle multiple components', async () => {
    const mockData = {
      v: 5,
      entries: {
        a: { type: 'docs', title: 'Button', id: 'button--docs' },
        b: { type: 'docs', title: 'Input', id: 'input--docs' },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentsProps(['Button', 'Input']);
    expect(result.content[0].text).toContain('### Button');
    expect(result.content[0].text).toContain('### Input');
    expect(result.content[0].text).toContain('<tr><td>prop</td></tr>');
  });

  it('getComponentList should throw when Storybook fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Gateway',
    } as any);
    const server = new StorybookMCPServer();
    await expect((server as any).getComponentList()).rejects.toThrow(
      /Failed to get component list/,
    );
  });

  it('getComponentsProps should report missing components', async () => {
    const mockData = {
      v: 5,
      entries: {},
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentsProps(['Missing']);
    expect(result.content[0].text).toContain('Component "Missing" not found in Storybook');
  });

  it('getComponentsProps should handle Playwright navigation failures', async () => {
    const mockData = {
      v: 5,
      entries: {
        a: { type: 'docs', title: 'Button', id: 'button--docs' },
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any);
    mockPage.goto.mockRejectedValueOnce(new Error('navigation timeout'));
    const server = new StorybookMCPServer();
    const result = await (server as any).getComponentsProps(['Button']);
    expect(result.content[0].text).toContain('navigation timeout');
  });

  it('executeCustomTool should serialize array results', async () => {
    mockPage.evaluate.mockResolvedValueOnce(['IconA', 'IconB']);
    const server = new StorybookMCPServer();
    const customTool = {
      name: 'getIconList',
      description: 'Fetch icons',
      parameters: {},
      page: 'https://example.com/storybook',
      handler: "['IconA','IconB']",
    };
    const result = await (server as any).executeCustomTool(customTool, {});
    expect(result.content[0].text).toBe('IconA\nIconB');
    expect(mockPage.goto).toHaveBeenCalledWith(customTool.page, {
      waitUntil: 'networkidle',
    });
  });

  it('executeCustomTool should surface handler errors', async () => {
    mockPage.evaluate.mockRejectedValueOnce(new Error('bad handler'));
    const server = new StorybookMCPServer();
    const customTool = {
      name: 'brokenTool',
      description: 'Fails',
      parameters: {},
      page: 'https://example.com/storybook',
      handler: "throw new Error('boom')",
    };
    await expect((server as any).executeCustomTool(customTool, {})).rejects.toThrow(
      /Failed to execute custom tool "brokenTool"/,
    );
  });
});
