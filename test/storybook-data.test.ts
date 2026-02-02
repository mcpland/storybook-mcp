import { describe, it, expect } from 'vitest';
import {
  getComponentList as getComponentListV3,
  getComponentPropsDocUrl as getComponentPropsDocUrlV3,
} from '../src/storybookv3.js';
import {
  getComponentList as getComponentListV5,
  getComponentPropsDocUrl as getComponentPropsDocUrlV5,
} from '../src/storybookv5.js';

const STORYBOOK_URL = 'https://example.com/storybook/index.json';

describe('Storybook data helpers', () => {
  it('returns empty arrays for invalid v3 data', () => {
    expect(getComponentListV3(null as any)).toEqual([]);
    expect(getComponentPropsDocUrlV3(null as any, 'Button', STORYBOOK_URL)).toBeNull();
  });

  it('throws when a v3 component cannot be found', () => {
    const v3Data = {
      v: 3 as const,
      stories: {
        button: {
          id: 'components-button--docs',
          title: 'Components/Button',
          name: 'Docs',
          importPath: 'src/button.tsx',
          kind: 'Components/Button',
          story: 'Docs',
          parameters: {
            __id: 'button',
            docsOnly: false,
            fileName: 'src/button.tsx',
          },
        },
      },
    };
    expect(() => getComponentPropsDocUrlV3(v3Data, 'Missing', STORYBOOK_URL)).toThrow(
      /Component "Missing" not found/,
    );
  });

  it('returns empty arrays for invalid v5 data', () => {
    expect(getComponentListV5(null as any)).toEqual([]);
    expect(getComponentPropsDocUrlV5(null as any, 'Button', STORYBOOK_URL)).toBeNull();
  });

  it('throws when a v5 component cannot be found', () => {
    const v5Data = {
      v: 5 as const,
      entries: {
        button: {
          type: 'docs',
          id: 'components-button--docs',
          name: 'Button',
          title: 'Button',
          importPath: 'src/button.tsx',
          tags: [],
        },
      },
    };
    expect(() => getComponentPropsDocUrlV5(v5Data, 'Missing', STORYBOOK_URL)).toThrow(
      /Component "Missing" not found/,
    );
  });
});
