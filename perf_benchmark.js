import { performance } from "perf_hooks";

// Original implementation
function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function arrayBufferToBase64UrlOriginal(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

// Optimized implementations

// 1. Using apply (good for small/medium buffers)
function arrayBufferToBase64UrlApply(buffer) {
  const bytes = new Uint8Array(buffer);
  return base64UrlEncode(String.fromCharCode.apply(null, bytes));
}

// 2. Chunking (safe for large buffers to avoid maximum call stack size exceeded)
function arrayBufferToBase64UrlChunked(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192; // Safe size across engines
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  return base64UrlEncode(binary);
}

// 3. Web API btoa directly using Array.from (often slower but less memory overhead)
// function arrayBufferToBase64UrlArrayFrom(buffer) {
//   return base64UrlEncode(String.fromCharCode(...new Uint8Array(buffer)));
// } // Spread can also blow stack on large buffers

function runBenchmark(name, func, bufferSize, iterations) {
  const buffer = new ArrayBuffer(bufferSize);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bufferSize; i++) {
    view[i] = i % 256;
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    func(buffer);
  }
  const end = performance.now();

  console.log(`${name}: ${end - start} ms (${iterations} iterations, ${bufferSize} bytes)`);
}

console.log("=== Running Benchmarks ===");

// Typical JWT Signature size is 32 bytes (HMAC SHA-256) or 256 bytes (RSA)
runBenchmark("Original (32 bytes)", arrayBufferToBase64UrlOriginal, 32, 100000);
runBenchmark("Apply (32 bytes)", arrayBufferToBase64UrlApply, 32, 100000);
runBenchmark("Chunked (32 bytes)", arrayBufferToBase64UrlChunked, 32, 100000);

console.log("--------------------------");
runBenchmark("Original (256 bytes)", arrayBufferToBase64UrlOriginal, 256, 100000);
runBenchmark("Apply (256 bytes)", arrayBufferToBase64UrlApply, 256, 100000);
runBenchmark("Chunked (256 bytes)", arrayBufferToBase64UrlChunked, 256, 100000);

console.log("--------------------------");
runBenchmark("Original (16384 bytes)", arrayBufferToBase64UrlOriginal, 16384, 1000);
// Apply might crash here depending on engine max call stack size, uncomment with caution
// runBenchmark("Apply (16384 bytes)", arrayBufferToBase64UrlApply, 16384, 1000);
runBenchmark("Chunked (16384 bytes)", arrayBufferToBase64UrlChunked, 16384, 1000);
