export type StorybookData = {
  v: 5;
  entries: {
    [key: string]: {
      type: string;
      id: string;
      name: string;
      title: string;
      importPath: string;
      tags: string[];
    };
  };
};

export const getComponentList = (data: StorybookData) => {
  if (!data || data.v !== 5 || !data.entries) {
    return [];
  }

  const entries = data.entries;

  // extract component names, filter only docs type entries
  const components = Object.values(entries)
    .filter((entry) => entry.type === 'docs')
    .map((entry) => entry.title)
    .filter((title: string) => title)
    .sort();

  // remove duplicates
  const uniqueComponents = [...new Set(components)];
  return uniqueComponents;
};

export const getComponentPropsDocUrl = (
  data: StorybookData,
  componentName: string,
  storybookUrl: string,
) => {
  if (!data || data.v !== 5 || !data.entries) {
    return null;
  }

  const entries = data.entries || {};

  // find matching component entry
  const matchingEntry = Object.values(entries).find(
    (entry) => entry.type === 'docs' && entry.title === componentName,
  );

  if (!matchingEntry) {
    throw new Error(`Component "${componentName}" not found in Storybook`);
  }

  const [fileName] = new URL(storybookUrl).pathname.split('/').slice(-1);

  // build component documentation page URL
  const baseUrl = storybookUrl.replace(`/${fileName}`, '');
  const componentUrl = `${baseUrl}/iframe.html?viewMode=${matchingEntry.type}&id=${matchingEntry.id}`;
  return componentUrl;
};
