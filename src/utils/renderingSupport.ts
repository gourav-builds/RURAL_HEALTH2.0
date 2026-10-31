let cached: boolean | undefined;
export function canRender3D(): boolean {
  if(cached!==undefined)return cached;
  try { const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2');cached=!!context;context?.getExtension('WEBGL_lose_context')?.loseContext();return cached; } catch { cached=false;return false; }
}
