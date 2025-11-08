# Storybook MCP Server

![Node CI](https://github.com/mcpland/storybook-mcp/workflows/Node%20CI/badge.svg)
[![npm](https://img.shields.io/npm/v/storybook-mcp.svg)](https://www.npmjs.com/package/storybook-mcp)
![license](https://img.shields.io/npm/l/storybook-mcp)

A Model Context Protocol (MCP) server that provides tools to interact with Storybook documentation and component information.

<a href="https://glama.ai/mcp/servers/@mcpland/storybook-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@mcpland/storybook-mcp/badge" alt="storybook-mcp MCP server" />
</a>

## Features

- **getComponentList**: Get a list of all components from a configured Storybook
- **getComponentsProps**: Get detailed props information for multiple components using headless browser automation
- **Custom Tools**: Create custom tools that can extract any information from your Storybook pages using JavaScript

## Installation and Configuration

### MCP Settings

Add the following configuration to MCP settings:

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "storybook-mcp@latest"],
      "env": {
        "STORYBOOK_URL": "<your_storybook_url>/index.json"
      }
    }
  }
}
```

### Environment Variables

- `STORYBOOK_URL` (required): The URL to your Storybook's index.json file
- `CUSTOM_TOOLS` (optional): JSON array of custom tool definitions for extracting specific information from your Storybook

## Usage

The server provides built-in tools and supports custom tools:

### Built-in Tools

#### 1. getComponentList

Retrieves a list of all available components from the configured Storybook.

**Example:**

```
Available components:
Accordion
Avatar
Badge
Button
...
```

#### 2. getComponentsProps

Gets detailed props information for multiple components, including:

- Property names
- Types
- Default values
- Descriptions
- Required/optional status

**Parameters:**

- `componentNames` (array of strings): Array of component names to get props information for

**Example usage:**

```
Tool: getComponentsProps
Parameters: { "componentNames": ["Button", "Input", "Avatar"] }
```

### Custom Tools

You can define custom tools to extract specific information from your Storybook pages. Each custom tool can:

- Navigate to any page in your Storybook
- Execute custom JavaScript to extract data
- Return structured data to the AI assistant

**Custom Tool Structure:**

```typescript
interface CustomTool {
  name: string;           // Unique tool name
  description: string;    // Tool description for the AI
  parameters: object;     // Input parameters schema (optional)
  page: string;          // URL to navigate to
  handler: string;       // JavaScript code to execute on the page
}
```

**Example Custom Tools:**

```json
[
  {
    "name": "getIconList",
    "description": "Get All Icons from the Icon page",
    "parameters": {},
    "page": "https://your-storybook.com/?path=/docs/icon--docs",
    "handler": "Array.from(document.querySelectorAll('.icon-name')).map(i => i.textContent)"
  },
  {
    "name": "getColorPalette",
    "description": "Extract color palette from design tokens",
    "parameters": {},
    "page": "https://your-storybook.com/?path=/docs/design-tokens--colors",
    "handler": "Array.from(document.querySelectorAll('.color-swatch')).map(el => ({ name: el.getAttribute('data-color-name'), value: el.style.backgroundColor }))"
  }
]
```

For more examples and detailed documentation, see [examples/custom-tools-example.md](examples/custom-tools-example.md).

## Example

Set `Spectrum` storybook-mcp config with `STORYBOOK_URL` and `CUSTOM_TOOLS` environment variables.

```json
{
  "mcpServers": {
    "storybook-mcp": {
      "command": "npx",
      "args": ["-y", "storybook-mcp@latest"],
      "env": {
        "STORYBOOK_URL": "https://opensource.adobe.com/spectrum-web-components/storybook/index.json",
        "CUSTOM_TOOLS": "[{\"name\":\"getIconList\",\"description\":\"Get All Icons from the Icon page\",\"parameters\":{},\"page\":\"https://opensource.adobe.com/spectrum-web-components/storybook/iframe.html?viewMode=docs&id=icons--docs&globals=\",\"handler\":\"Array.from(document.querySelector('icons-demo').shadowRoot.querySelectorAll('.icon')).map(i => i.textContent)\"}]"
      }
    }
  }
}
```

## How it works

1. **Component List**: The server fetches the Storybook's `index.json` file(v3 is `stories.json`) and extracts all components marked as "docs" type
2. **Props Information**: For component props, the server:
   - Finds the component's documentation ID from the index.json
   - Constructs the iframe URL for the component's docs page
   - Uses Playwright to load the page in a headless browser
   - Extracts the props table HTML from the documentation

## Supported Storybook URLs

The server works with any Storybook that exposes an `index.json` file(v3 is `stories.json`). Common patterns:

- `https://your-storybook-domain.com/index.json`
- `https://your-storybook-domain.com/storybook/index.json`

## Development

### Local Development

1. Clone the repository
2. Install dependencies: `yarn install`
3. Install Playwright browsers: `npx playwright install chromium`
4. Set the environment variable: `export STORYBOOK_URL="your-storybook-url"`
5. Run in development mode: `yarn dev`

> Note: You can also use `npx @modelcontextprotocol/inspector tsx src/index.ts` instead of `yarn dev` if you prefer.

### Building

```bash
yarn build
```

### Testing

```bash
yarn test
```

## Requirements

- Node.js 18.0.0 or higher
- Chromium browser (automatically installed with Playwright)

## Error Handling

The server includes comprehensive error handling for:

- Missing or invalid Storybook URLs
- Network connectivity issues
- Component not found scenarios
- Playwright browser automation failures

## License

Storybook MCP is [MIT licensed](https://github.com/mcpland/storybook-mcp/blob/main/LICENSE).