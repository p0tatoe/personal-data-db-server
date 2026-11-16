import { parse as parseHtml, NodeType } from "node-html-parser";
import type { HTMLElement } from "node-html-parser";

export type AdvertiserSource = "uploaded_list" | "interaction";

export interface Advertiser {
  name: string;
  source: AdvertiserSource;
}

// The export identifies each list only by its human-readable label.
const SOURCE_BY_LABEL = new Map<string, AdvertiserSource>([
  ["A list uploaded or used by the advertiser", "uploaded_list"],
  [
    "Interactions you may have had with the advertiser's website, app or store",
    "interaction",
  ],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Facebook writes each UTF-8 byte as if it were its own character, so "é"
// (bytes C3 A9) arrives as "Ã©". Turning the characters back into bytes and
// decoding those as UTF-8 recovers the original. Text that was never garbled
// does not survive that round trip, so it is returned unchanged.
function fixEncoding(text: string): string {
  const fixed = Buffer.from(text, "latin1").toString("utf8");
  return fixed.includes("�") ? text : fixed;
}

export function parseAdvertisers(data: unknown): Advertiser[] {
  if (!isRecord(data) || !Array.isArray(data.label_values)) {
    throw new Error('Expected an object with a "label_values" array');
  }

  const advertisers: Advertiser[] = [];

  for (const group of data.label_values) {
    if (
      !isRecord(group) ||
      typeof group.label !== "string" ||
      !Array.isArray(group.vec)
    ) {
      throw new Error('Each list needs a "label" string and a "vec" array');
    }

    const source = SOURCE_BY_LABEL.get(group.label);
    if (source === undefined) {
      throw new Error(`Unrecognised list label: "${group.label}"`);
    }

    for (const item of group.vec) {
      if (!isRecord(item) || typeof item.value !== "string") {
        throw new Error(`Each entry in "${group.label}" needs a "value" string`);
      }

      const name = fixEncoding(item.value).trim();
      if (name === "") continue;

      advertisers.push({ name, source });
    }
  }

  return advertisers;
}

// The HTML export holds the same two lists. Each one is a table cell whose
// first line of text is the list's label, followed by nested divs with one
// advertiser name in each innermost div. Matching on that shape instead of
// Facebook's generated class names (like "_2ph_") keeps this working if they
// rename them.
export function parseAdvertisersHtml(html: string): Advertiser[] {
  const root = parseHtml(html);
  const advertisers: Advertiser[] = [];
  let foundList = false;

  for (const cell of root.querySelectorAll("td")) {
    const firstText = cell.childNodes.find(
      (node) => node.nodeType === NodeType.TEXT_NODE && node.text.trim() !== "",
    );
    const source = firstText && SOURCE_BY_LABEL.get(firstText.text.trim());
    if (source === undefined) continue;
    foundList = true;

    for (const div of cell.querySelectorAll("div")) {
      if (!isInnermost(div)) continue;
      const name = div.text.trim();
      if (name !== "") advertisers.push({ name, source });
    }
  }

  if (!foundList) {
    throw new Error("No advertiser lists found in this HTML file");
  }
  return advertisers;
}

function isInnermost(element: HTMLElement): boolean {
  return element.childNodes.every((node) => node.nodeType === NodeType.TEXT_NODE);
}

// Uploads can be either export format. JSON always starts with "{", so look
// at the content rather than trusting the file name or the browser's type.
export function parseUpload(text: string): Advertiser[] {
  if (text.trimStart().startsWith("{")) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("This file looks like JSON but could not be read");
    }
    return parseAdvertisers(data);
  }
  return parseAdvertisersHtml(text);
}
