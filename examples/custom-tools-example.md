# Custom Tools Example

This example demonstrates how to configure and use custom tools with the Storybook MCP Server.

## Configuration

Add custom tools to your MCP settings configuration:

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "storybook-mcp"],
      "env": {
        "STORYBOOK_URL": "https://your-storybook.com/index.json",
        "CUSTOM_TOOLS": "[{\"name\":\"getIconList\",\"description\":\"Get All Icons from the Icon page\",\"parameters\":{},\"page\":\"https://spring-ui.jupiter.int.rclabenv.com/develop/iframe.html?viewMode=docs&id=icon-icon-list--icon-list&args=\",\"handler\":\"Array.from(document.querySelectorAll('#story--icon-icon-list--icon-list [class=\\\"typography-subtitleMini\\\"]')).map(i => i.textContent)\"}]"
      }
    }
  }
}
```

## Custom Tool Structure

Each custom tool in the `CUSTOM_TOOLS` array must have the following structure:

```typescript
interface CustomTool {
  name: string; // Unique tool name
  description: string; // Tool description for the AI
  parameters: object; // Input parameters schema (optional)
  page: string; // URL to navigate to
  handler: string; // JavaScript code to execute on the page
}
```

## Example Custom Tools

### 1. Get Icon List

```json
{
  "name": "getIconList",
  "description": "Get All Icons from the Icon page",
  "parameters": {},
  "page": "https://your-storybook.com/?path=/docs/icon--docs",
  "handler": "Array.from(document.querySelectorAll('.icon-name')).map(i => i.textContent)"
}
```

### 2. Get Color Palette

```json
{
  "name": "getColorPalette",
  "description": "Extract color palette from design tokens",
  "parameters": {},
  "page": "https://your-storybook.com/?path=/docs/design-tokens--colors",
  "handler": "Array.from(document.querySelectorAll('.color-swatch')).map(el => ({ name: el.getAttribute('data-color-name'), value: el.style.backgroundColor }))"
}
```

### 3. Get Component Status

```json
{
  "name": "getComponentStatus",
  "description": "Get component development status",
  "parameters": {
    "componentName": {
      "type": "string",
      "description": "Name of the component to check"
    }
  },
  "page": "https://your-storybook.com/?path=/docs/components--overview",
  "handler": "document.querySelector(`[data-component=\"${arguments[0].componentName}\"] .status`).textContent"
}
```

## Handler JavaScript Guidelines

The `handler` field contains JavaScript code that will be executed in the context of the loaded page. Here are some guidelines:

1. **Return Values**: The handler should return a value that can be serialized (string, number, boolean, array, or plain object)

2. **DOM Access**: You have full access to the DOM of the loaded page

   ```javascript
   // Get text content
   "document.querySelector('.title').textContent";

   // Get multiple elements
   "Array.from(document.querySelectorAll('.item')).map(el => el.textContent)";

   // Get attributes
   "document.querySelector('.icon').getAttribute('data-icon-name')";
   ```

3. **Error Handling**: Wrap your code in try-catch for better error messages

   ```javascript
   "try { return document.querySelector('.data').textContent; } catch(e) { return 'Element not found'; }";
   ```

4. **Parameters**: Access tool parameters via the `arguments` array
   ```javascript
   "document.querySelector(`[data-id=\"${arguments[0].itemId}\"]`).textContent";
   ```

## Usage

Once configured, your custom tools will appear alongside the built-in tools:

- `getComponentList` (built-in)
- `getComponentsProps` (built-in)
- `getIconList` (custom)
- `getColorPalette` (custom)
- `getComponentStatus` (custom)

The AI assistant can then use these tools to extract specific information from your Storybook documentation.

## Troubleshooting

1. **Invalid URL**: Ensure the `page` URL is accessible and returns a valid HTML page
2. **Handler Errors**: Test your JavaScript code in the browser console on the target page first
3. **Timing Issues**: Some pages may need time to load; the implementation includes a 2-second wait
4. **Selector Changes**: If your Storybook UI changes, you may need to update the CSS selectors in your handlers

## Security Considerations

- Custom tools execute JavaScript in a headless browser environment
- Only configure tools that access trusted Storybook URLs
- Validate and sanitize any dynamic content in your handlers
