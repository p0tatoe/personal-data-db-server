import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseAdvertisers,
  parseAdvertisersHtml,
  parseUpload,
} from "./parseAdvertisers.ts";

const LIST_LABEL = "A list uploaded or used by the advertiser";
const INTERACTION_LABEL =
  "Interactions you may have had with the advertiser's website, app or store";

test("tags each advertiser with the list it came from", () => {
  const result = parseAdvertisers({
    label_values: [
      { label: LIST_LABEL, vec: [{ value: "Etsy" }] },
      { label: INTERACTION_LABEL, vec: [{ value: "Etsy" }, { value: "Uber" }] },
    ],
  });

  assert.deepEqual(result, [
    { name: "Etsy", source: "uploaded_list" },
    { name: "Etsy", source: "interaction" },
    { name: "Uber", source: "interaction" },
  ]);
});

test("repairs garbled characters and leaves correct ones alone", () => {
  const result = parseAdvertisers({
    label_values: [
      {
        label: LIST_LABEL,
        vec: [{ value: "CondÃ© Nast" }, { value: "Café Uno" }],
      },
    ],
  });

  assert.deepEqual(
    result.map((a) => a.name),
    ["Condé Nast", "Café Uno"],
  );
});

test("trims names and drops blank ones", () => {
  const result = parseAdvertisers({
    label_values: [
      { label: LIST_LABEL, vec: [{ value: "Our Media " }, { value: "  " }] },
    ],
  });

  assert.deepEqual(result, [{ name: "Our Media", source: "uploaded_list" }]);
});

test("rejects input that is not an advertiser export", () => {
  assert.throws(() => parseAdvertisers({ hello: "world" }), /label_values/);
  assert.throws(
    () => parseAdvertisers({ label_values: [{ label: "Other", vec: [] }] }),
    /Unrecognised list label/,
  );
});

const HTML = `<table>
  <tr><td colspan="2">${LIST_LABEL}<div><div>
    <div><section><div>Etsy</div></section></div>
    <div><section><div>Healthy Do&#039;s &amp; Dont&#039;s </div></section></div>
  </div></div></td></tr>
  <tr><td colspan="2">Interactions you may have had with the advertiser&#039;s website, app or store<div><div>
    <div><section><div>Uber</div></section></div>
  </div></div></td></tr>
</table>`;

test("reads both lists from the HTML export and decodes entities", () => {
  assert.deepEqual(parseAdvertisersHtml(HTML), [
    { name: "Etsy", source: "uploaded_list" },
    { name: "Healthy Do's & Dont's", source: "uploaded_list" },
    { name: "Uber", source: "interaction" },
  ]);
});

test("rejects HTML that has no advertiser lists", () => {
  assert.throws(
    () => parseAdvertisersHtml("<p>hello</p>"),
    /No advertiser lists/,
  );
});

test("parseUpload picks the format from the content", () => {
  const json = JSON.stringify({
    label_values: [{ label: LIST_LABEL, vec: [{ value: "Etsy" }] }],
  });
  assert.deepEqual(parseUpload(json), [{ name: "Etsy", source: "uploaded_list" }]);
  assert.equal(parseUpload(HTML).length, 3);
  assert.throws(() => parseUpload("{ not json"), /could not be read/);
});
