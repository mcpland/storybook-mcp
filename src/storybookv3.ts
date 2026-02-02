export type StorybookData = {
  v: 3;
  stories: {
    [key: string]: {
      id: string;
      title: string;
      name: string;
      importPath: string;
      kind: string;
      story: string;
      parameters: {
        __id: string;
        docsOnly: boolean;
        fileName: string;
      };
    };
  };
};

export const getComponentList = (storybookData: StorybookData) => {
  if (!storybookData || storybookData.v !== 3 || !storybookData.stories) {
    return [];
  }

  const componentSet = new Set<string>();
  const stories = storybookData.stories;

  for (const key in stories) {
    if (Object.prototype.hasOwnProperty.call(stories, key)) {
      const story = stories[key];
      // filter out docs pages
      if (story.parameters && !story.parameters.docsOnly) {
        // get component path or name from 'kind' property
        const componentPath = story.kind.split('/');
        // usually the last part is the component name
        const componentName = componentPath[componentPath.length - 1];
        componentSet.add(componentName.trim());
      }
    }
  }

  // align with  v5
  return Array.from(componentSet).sort();
};

export const getComponentPropsDocUrl = (
  data: StorybookData,
  componentName: string,
  storybookUrl: string,
) => {
  if (!data || data.v !== 3 || !data.stories) {
    return null;
  }

  const stories = data.stories || {};

  // find matching component entry
  const matchingEntry = Object.values(stories).find((entry) =>
    entry.kind.endsWith(`/${componentName}`),
  );

  if (!matchingEntry) {
    throw new Error(`Component "${componentName}" not found in Storybook`);
  }

  const [fileName] = new URL(storybookUrl).pathname.split('/').slice(-1);

  // build component documentation page URL
  const baseUrl = storybookUrl.replace(`/${fileName}`, '');
  const componentUrl = `${baseUrl}/iframe.html?viewMode=docs&id=${matchingEntry.id}`;
  return componentUrl;
};
