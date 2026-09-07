import { useEffect, useState } from 'react';

export default function useAmbientAudio(url, enabled, visible) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!url || !enabled || !visible) return;
    const audio = new Audio(url);
    let active = true;
    audio.loop = true;
    audio.volume = 0.18;
    const fail = () => { if (active) setFailed(true); };
    audio.addEventListener('error', fail);
    try {
      const playback = audio.play();
      playback?.catch(fail);
    } catch { fail(); }
    return () => {
      active = false;
      audio.pause();
      audio.removeEventListener('error', fail);
      audio.removeAttribute('src');
      audio.load();
    };
  }, [url, enabled, visible]);
  return failed;
}
