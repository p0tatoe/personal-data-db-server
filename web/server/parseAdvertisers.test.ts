import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAdvertisers } from "./parseAdvertisers.ts";

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
