export function hello(): string {
  return "toolbudget";
}

export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema | JSONSchema[];
  required?: string[];
  enum?: unknown[];
  description?: string;
  [k: string]: unknown;
}

export interface ToolDef {
  name: string;
  description?: string;
  inputSchema?: JSONSchema;
}

export interface Surface {
  serverName?: string;
  tools: ToolDef[];
}
