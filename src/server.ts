import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { chromium } from "playwright";
import {
  StorybookData as StorybookDataV3,
  getComponentList as getComponentListV3,
  getComponentPropsDocUrl as getComponentPropsDocUrlV3,
} from "./storybookv3.js";
import {
  StorybookData as StorybookDataV5,
  getComponentList as getComponentListV5,
  getComponentPropsDocUrl as getComponentPropsDocUrlV5,
} from "./storybookv5.js";

// Custom tool interface
interface CustomTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  page: string;
  handler: string;
}

// define tool parameters
const GetComponentListSchema = z.object({});

const GetComponentsPropsSchema = z.object({
  componentNames: z
    .array(z.string())
    .describe("Array of component names to get props information for"),
});

export class StorybookMCPServer {
  private server: Server;
  private storybookUrl: string;
  private customTools: CustomTool[] = [];

  constructor() {
    this.server = new Server(
      {
        name: "storybook-mcp",
        version: "0.0.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    if (!process.env.STORYBOOK_URL) {
      throw new Error("STORYBOOK_URL environment variable is required");
    }

    // get Storybook URL from environment variable
    this.storybookUrl = process.env.STORYBOOK_URL;
    if (!this.storybookUrl) {
      throw new Error("STORYBOOK_URL environment variable is required");
    }

    // Parse custom tools from environment variable
    this.parseCustomTools();

    this.setupToolHandlers();
  }

  private parseCustomTools() {
    const customToolsEnv = process.env.CUSTOM_TOOLS;
    if (customToolsEnv) {
      try {
        const parsed = JSON.parse(customToolsEnv);
        if (Array.isArray(parsed)) {
          this.customTools = parsed.filter((tool: any, index: number) => {
            // Validate required fields
            if (!tool.name || typeof tool.name !== "string") {
              console.warn(
                `Custom tool at index ${index}: missing or invalid 'name' field`
              );
              return false;
            }
            if (!tool.description || typeof tool.description !== "string") {
              console.warn(
                `Custom tool "${tool.name}": missing or invalid 'description' field`
              );
              return false;
            }
            if (!tool.page || typeof tool.page !== "string") {
              console.warn(
                `Custom tool "${tool.name}": missing or invalid 'page' field`
              );
              return false;
            }
            if (!tool.handler || typeof tool.handler !== "string") {
              console.warn(
                `Custom tool "${tool.name}": missing or invalid 'handler' field`
              );
              return false;
            }

            // Validate URL format
            try {
              new URL(tool.page);
            } catch {
              console.warn(
                `Custom tool "${tool.name}": invalid URL format in 'page' field`
              );
              return false;
            }

            // Validate parameters field
            if (tool.parameters && typeof tool.parameters !== "object") {
              console.warn(
                `Custom tool "${tool.name}": invalid 'parameters' field, must be an object`
              );
              return false;
            }

            return true;
          });

          if (this.customTools.length > 0) {
            console.error(
              `Successfully loaded ${
                this.customTools.length
              } custom tools: ${this.customTools.map((t) => t.name).join(", ")}`
            );
          }
        } else {
          console.warn(
            "CUSTOM_TOOLS environment variable must contain a JSON array"
          );
        }
      } catch (error) {
        console.warn(
          "Failed to parse CUSTOM_TOOLS environment variable:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  private setupToolHandlers() {
    // list available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const defaultTools = [
        {
          name: "getComponentList",
          description:
            "Get a list of all components from the configured Storybook",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "getComponentsProps",
          description: "Get props information for multiple components",
          inputSchema: {
            type: "object",
            properties: {
              componentNames: {
                type: "array",
                items: {
                  type: "string",
                },
                description:
                  "Array of component names to get props information for",
              },
            },
            required: ["componentNames"],
          },
        },
      ];

      // Add custom tools to the list
      const customToolDefs = this.customTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object",
          properties: tool.parameters || {},
          required: Object.keys(tool.parameters || {}),
        },
      }));

      return {
        tools: [...defaultTools, ...customToolDefs],
      };
    });

    // handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "getComponentList":
            return await this.getComponentList();
          case "getComponentsProps":
            const parsed = GetComponentsPropsSchema.parse(args);
            return await this.getComponentsProps(parsed.componentNames);
          default:
            // Check if it's a custom tool
            const customTool = this.customTools.find(
              (tool) => tool.name === name
            );
            if (customTool) {
              return await this.executeCustomTool(customTool, args);
            }
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  // get component list
  private async getComponentList() {
    try {
      const response = await fetch(this.storybookUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Storybook data: ${response.statusText}`
        );
      }

      const data = (await response.json()) as StorybookDataV3 | StorybookDataV5;

      const components =
        data.v === 3 ? getComponentListV3(data) : getComponentListV5(data);

      return {
        content: [
          {
            type: "text",
            text: `Available components:\n${components.join("\n")}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to get component list: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // get multiple components props information
  private async getComponentsProps(componentNames: string[]) {
    try {
      // 1. get Storybook data to find component IDs
      const response = await fetch(this.storybookUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Storybook data: ${response.statusText}`
        );
      }

      const data = (await response.json()) as StorybookDataV3 | StorybookDataV5;

      const results: { [componentName: string]: string } = {};
      const errors: { [componentName: string]: string } = {};

      // use Playwright to get page content
      const browser = await chromium.launch({ headless: true });

      try {
        for (const componentName of componentNames) {
          try {
            const componentUrl =
              data.v === 3
                ? getComponentPropsDocUrlV3(
                    data,
                    componentName,
                    this.storybookUrl
                  )
                : getComponentPropsDocUrlV5(
                    data,
                    componentName,
                    this.storybookUrl
                  );

            if (!componentUrl) {
              errors[
                componentName
              ] = `Component "${componentName}" not found in Storybook`;
              continue;
            }

            const page = await browser.newPage();

            try {
              await page.goto(componentUrl, { waitUntil: "networkidle" });

              // wait for table to load
              await page.waitForSelector("table.docblock-argstable", {
                timeout: 10000,
              });

              // get props table HTML
              const propsTableHTML = await page.$eval(
                "table.docblock-argstable",
                (element: HTMLElement) => element.outerHTML
              );

              results[componentName] = propsTableHTML;
            } catch (pageError) {
              errors[
                componentName
              ] = `Failed to load component page or find props table: ${
                pageError instanceof Error
                  ? pageError.message
                  : String(pageError)
              }`;
            } finally {
              await page.close();
            }
          } catch (componentError) {
            errors[componentName] = `Failed to get component URL: ${
              componentError instanceof Error
                ? componentError.message
                : String(componentError)
            }`;
          }
        }
      } finally {
        await browser.close();
      }

      // format results
      let resultText = "Props information for components:\n\n";

      for (const componentName of componentNames) {
        resultText += `### ${componentName}\n`;
        if (results[componentName]) {
          resultText += `${results[componentName]}\n\n`;
        } else if (errors[componentName]) {
          resultText += `Error: ${errors[componentName]}\n\n`;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to get components props: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // execute custom tool
  private async executeCustomTool(customTool: CustomTool, args: any) {
    try {
      const browser = await chromium.launch({ headless: true });

      try {
        const page = await browser.newPage();

        try {
          // Navigate to the specified page
          await page.goto(customTool.page, { waitUntil: "networkidle" });

          // Wait a bit for the page to fully load
          await page.waitForTimeout(2000);

          const result = await page.evaluate((handlerCode) => {
            return new Function(`return ${handlerCode}`).call(null);
          }, customTool.handler);

          return {
            content: [
              {
                type: "text",
                text: Array.isArray(result)
                  ? result.join("\n")
                  : typeof result === "object"
                  ? JSON.stringify(result, null, 2)
                  : String(result),
              },
            ],
          };
        } catch (pageError) {
          throw new Error(
            `Failed to execute custom tool "${customTool.name}": ${
              pageError instanceof Error ? pageError.message : String(pageError)
            }`
          );
        } finally {
          await page.close();
        }
      } finally {
        await browser.close();
      }
    } catch (error) {
      throw new Error(
        `Failed to execute custom tool "${customTool.name}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // start Stdio server
  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
