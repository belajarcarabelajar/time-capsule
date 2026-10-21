// Laptops without Playwright's bundled browser point PLAYWRIGHT_CHROMIUM at a system one.
// SwiftShader is slow enough with motion on that the frame monitor falls back to the poster, so PLAYWRIGHT_GPU=1 uses the GPU.
export function chromiumLaunchOptions(env = process.env) {
  const args = env.PLAYWRIGHT_GPU === '1'
    ? ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl-egl']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  return env.PLAYWRIGHT_CHROMIUM ? { args, executablePath: env.PLAYWRIGHT_CHROMIUM } : { args };
}
