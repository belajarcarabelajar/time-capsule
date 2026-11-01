import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const web = resolve(import.meta.dir, "../apps/web");
const html = readFileSync(resolve(web, "index.html"), "utf8");
const head = html.slice(0, html.indexOf("</head>"));
const publicFile = (name) => readFileSync(resolve(web, "public", name));

// PNG IHDR: width and height are big-endian at bytes 16 and 20.
const pngSize = (bytes) => {
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};

test("home page links Google-eligible raster icons before any SVG icon", () => {
  const icons = [...head.matchAll(/<link\s[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g)].map((m) => m[0]);
  expect(icons[0]).toContain('href="/favicon.ico"');
  expect(icons[0]).toContain('sizes="48x48"');
  expect(icons.some((tag) => tag.includes('href="/icon-192.png"') && tag.includes('sizes="192x192"'))).toBe(true);
  expect(icons.some((tag) => tag.includes('rel="apple-touch-icon"') && tag.includes('href="/apple-touch-icon.png"'))).toBe(true);
  const firstSvg = icons.findIndex((tag) => tag.includes("svg"));
  if (firstSvg !== -1) expect(firstSvg).toBe(icons.length - 1);
});

test("icon files exist with the sizes the head declares", () => {
  const ico = publicFile("favicon.ico");
  expect(ico.readUInt16LE(2)).toBe(1); // ICO type
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256);
  expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48]);
  expect(pngSize(publicFile("icon-192.png"))).toEqual([192, 192]);
  expect(pngSize(publicFile("apple-touch-icon.png"))).toEqual([180, 180]);
  expect(pngSize(publicFile("logo-512.png"))).toEqual([512, 512]);
});

test("home page JSON-LD declares an Organization logo PNG of at least 112x112", () => {
  const block = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(block).not.toBeNull();
  const data = JSON.parse(block[1]);
  const org = [data, ...(data["@graph"] ?? [])].find((node) => node["@type"] === "Organization");
  expect(org).toBeDefined();
  expect(org.logo).toBe("https://time-capsule.belajarcarabelajar.com/logo-512.png");
  const [width, height] = pngSize(publicFile("logo-512.png"));
  expect(Math.min(width, height)).toBeGreaterThanOrEqual(112);
});
