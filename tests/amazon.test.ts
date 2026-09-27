import assert from "node:assert/strict";
import test from "node:test";
import { amazonSearchUrl, cleanAmazonImageUrl, cleanAmazonUrl, cleanProductImageUrl, cleanProductUrl, looksLikeImageUrl, retailerForUrl, walmartSearchUrl } from "../lib/amazon";

test("amazon search URLs encode the item name", () => {
  assert.equal(amazonSearchUrl("LEGO Star Wars & ships"), "https://www.amazon.com/s?k=LEGO+Star+Wars+%26+ships");
  assert.equal(amazonSearchUrl("   "), "");
});

test("Walmart search URLs encode the item name", () => {
  assert.equal(walmartSearchUrl("LEGO Star Wars & ships"), "https://www.walmart.com/search?q=LEGO+Star+Wars+%26+ships");
  assert.equal(walmartSearchUrl("   "), "");
});

test("Amazon thumbnails only accept official media hosts", () => {
  assert.equal(cleanAmazonImageUrl("https://m.media-amazon.com/images/I/item.jpg"), "https://m.media-amazon.com/images/I/item.jpg");
  assert.equal(cleanAmazonImageUrl("https://images-na.ssl-images-amazon.com/images/I/item.jpg"), "https://images-na.ssl-images-amazon.com/images/I/item.jpg");
  assert.equal(cleanAmazonImageUrl("https://example.com/item.jpg"), null);
});

test("only secure Amazon links can be attached to a Christmas-list item", () => {
  assert.equal(cleanAmazonUrl("https://www.amazon.com/dp/B000123#details"), "https://www.amazon.com/dp/B000123");
  assert.equal(cleanAmazonUrl("https://smile.amazon.com/dp/B000123"), "https://smile.amazon.com/dp/B000123");
  assert.equal(cleanAmazonUrl("https://a.co/d/abc123"), "https://a.co/d/abc123");
  assert.equal(cleanAmazonUrl("http://amazon.com/dp/B000123"), null);
  assert.equal(cleanAmazonUrl("https://amazon.com.example.com/fake"), null);
  assert.equal(cleanAmazonUrl("not a url"), null);
});

test("secure Walmart product links and images can be attached to a wish", () => {
  assert.equal(cleanAmazonUrl("https://www.walmart.com/ip/example/123#details"), "https://www.walmart.com/ip/example/123");
  assert.equal(cleanAmazonImageUrl("https://i5.walmartimages.com/seo/example.jpg"), "https://i5.walmartimages.com/seo/example.jpg");
  assert.equal(cleanAmazonUrl("https://walmart.com.example.com/ip/example"), null);
  assert.equal(retailerForUrl("https://www.walmart.com/ip/example/123"), "Walmart");
  assert.equal(retailerForUrl("https://www.amazon.com/dp/B000123"), "Amazon");
});

test("wishlist links and images can come from an official store outside Amazon and Walmart", () => {
  const bfdiImage = "https://shop.jacknjellify.com/cdn/shop/files/rn-image_picker_lib_temp_227333e1-5309-4644-beff-46dacf332085.jpg?v=1773215959&width=1280";
  assert.equal(cleanProductUrl("https://shop.jacknjellify.com/products/bfdi-plush#details"), "https://shop.jacknjellify.com/products/bfdi-plush");
  assert.equal(cleanProductImageUrl(bfdiImage), bfdiImage);
  assert.equal(looksLikeImageUrl(bfdiImage), true);
  assert.equal(retailerForUrl("https://shop.jacknjellify.com/products/bfdi-plush"), "shop.jacknjellify.com");
  assert.equal(cleanProductUrl("http://shop.jacknjellify.com/products/bfdi-plush"), null);
});
