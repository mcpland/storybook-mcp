import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockStartStdio = vi.fn();
const StorybookMCPServerMock = vi.fn().mockImplementation(() => ({
  startStdio: mockStartStdio,
}));

vi.mock('../src/server.js', () => ({
  StorybookMCPServer: StorybookMCPServerMock,
}));

describe('CLI entrypoint', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    mockStartStdio.mockReset();
    StorybookMCPServerMock.mockClear();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      return undefined as never;
    }) as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('starts the MCP server successfully', async () => {
    mockStartStdio.mockResolvedValueOnce(undefined);
    await import('../src/index.js');
    expect(StorybookMCPServerMock).toHaveBeenCalledTimes(1);
    expect(mockStartStdio).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs and exits when startup fails', async () => {
    const failure = new Error('boom');
    mockStartStdio.mockRejectedValueOnce(failure);
    await import('../src/index.js');
    expect(errorSpy).toHaveBeenCalledWith('Failed to start Storybook MCP Server:', failure);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
