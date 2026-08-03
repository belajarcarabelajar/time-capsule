import { performance } from "perf_hooks";

// Cloudflare Workers run on V8, similar to Node.js, so Node benchmark is representative.
// However, let's also test a byte-array to base64 implementation that uses Buffer if available,
// but since the original is arrayBufferToBase64Url, let's just stick to the apply/chunking for pure JS.

function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function original(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

function optimized(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192; // Cloudflare workers V8 limits apply arguments. 8192 is very safe.
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  return base64UrlEncode(binary);
}

// Another alternative, simpler logic since typically we encode small buffers (32 bytes HMAC signatures).
function optimizedSmall(buffer) {
  const bytes = new Uint8Array(buffer);
  // For small buffers like JWT signatures, chunking overhead might exist.
  // But 8192 chunk size means loop only runs once for small buffers anyway.
  return base64UrlEncode(String.fromCharCode.apply(null, bytes));
}

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

console.log("=== Node (V8 Engine) - Repr. for Cloudflare Workers ===");
runBenchmark("Original (32 bytes)", original, 32, 500000);
runBenchmark("Optimized (Chunked) (32 bytes)", optimized, 32, 500000);
runBenchmark("Optimized (Apply) (32 bytes)", optimizedSmall, 32, 500000);

console.log("--------------------------");
runBenchmark("Original (256 bytes)", original, 256, 500000);
runBenchmark("Optimized (Chunked) (256 bytes)", optimized, 256, 500000);
runBenchmark("Optimized (Apply) (256 bytes)", optimizedSmall, 256, 500000);
