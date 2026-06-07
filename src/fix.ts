import type { Surface } from "./model.ts";

export interface FixChange {
  tool: string;
  field: "description";
  suggestion: string;
}

// Deterministic, no-LLM suggestions: derive a starter description from the tool
// name and its parameters. (An optional BYOK AI-polish pass can be added later.)
export function suggestFixes(surface: Surface): FixChange[] {
  const out: FixChange[] = [];
  for (const t of surface.tools) {
    if (!t.description || t.description.trim() === "") {
      const verbObject = t.name.replace(/[_-]+/g, " ");
      const params = t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : [];
      const tail = params.length ? ` Parameters: ${params.join(", ")}.` : "";
      out.push({ tool: t.name, field: "description", suggestion: `${verbObject[0]?.toUpperCase()}${verbObject.slice(1)}.${tail} (Edit this starter description.)` });
    }
  }
  return out;
}
