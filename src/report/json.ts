import type { Report } from "../core/report.ts";
export function toJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
