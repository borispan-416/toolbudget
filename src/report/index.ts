import type { Report } from "../core/report.ts";
import { toJson } from "./json.ts";
import { toMarkdown } from "./markdown.ts";
import { toPretty } from "./pretty.ts";

export type Format = "pretty" | "json" | "markdown";

export function render(report: Report, format: Format): string {
  switch (format) {
    case "json": return toJson(report);
    case "markdown": return toMarkdown(report);
    case "pretty": return toPretty(report);
  }
}
