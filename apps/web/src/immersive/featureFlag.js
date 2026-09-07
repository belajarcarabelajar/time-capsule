export function isImmersiveEnabled(value = import.meta.env?.VITE_IMMERSIVE_ENABLED) {
  return value !== 'false';
}
