import assert from "node:assert/strict";
import test from "node:test";
import { parseHolidayDraft } from "../lib/holiday-draft";

test("guest drafts preserve names and products without retaining unsafe URLs", () => {
  const result = parseHolidayDraft([{ id: "550e8400-e29b-41d4-a716-446655440000", title: "Christmas wishes", items: [
    { asin: "one", title: "Train", url: "https://www.amazon.com/dp/B012345678", imageUrl: "https://m.media-amazon.com/train.jpg" },
    { asin: "two", title: "Book", url: "javascript:alert(1)", imageUrl: "https://evil.example/image" },
    { asin: "three", title: "Third gift" },
  ] }]);
  assert.equal(result[0].title, "Christmas wishes");
  assert.equal(result[0].items.length, 2);
  assert.equal(result[0].items[0].url, "https://www.amazon.com/dp/B012345678");
  assert.equal(result[0].items[1].url, "");
  assert.equal(result[0].items[1].imageUrl, null);
});

test("unusable browser drafts cannot be imported", () => {
  assert.deepEqual(parseHolidayDraft(null), []);
  assert.deepEqual(parseHolidayDraft([{ id: "bad-id", title: "List", items: [] }]), []);
});
