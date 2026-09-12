import assert from "node:assert/strict";
import test from "node:test";
import { amazonSearchUrl, cleanAmazonUrl } from "../lib/amazon";

test("amazon search URLs encode the item name", () => {
  assert.equal(amazonSearchUrl("LEGO Star Wars & ships"), "https://www.amazon.com/s?k=LEGO+Star+Wars+%26+ships");
  assert.equal(amazonSearchUrl("   "), "");
});

test("only secure Amazon links can be attached to a Christmas-list item", () => {
  assert.equal(cleanAmazonUrl("https://www.amazon.com/dp/B000123#details"), "https://www.amazon.com/dp/B000123");
  assert.equal(cleanAmazonUrl("https://smile.amazon.com/dp/B000123"), "https://smile.amazon.com/dp/B000123");
  assert.equal(cleanAmazonUrl("https://a.co/d/abc123"), "https://a.co/d/abc123");
  assert.equal(cleanAmazonUrl("http://amazon.com/dp/B000123"), null);
  assert.equal(cleanAmazonUrl("https://amazon.com.example.com/fake"), null);
  assert.equal(cleanAmazonUrl("not a url"), null);
});
