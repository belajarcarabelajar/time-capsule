import React, { useState, useEffect, useRef } from 'react';
import { SoundEngine } from '@time-capsule/game-engine';

const Typewriter = ({ text, onComplete, speed = 20 }) => { 
  const [segments, setSegments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // Keep ref updated
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Parse text into segments
  useEffect(() => {
    const validText = typeof text === 'string' ? text : String(text || '');
    const rawSegments = validText.split(/(<b>.*?<\/b>|<i>.*?<\/i>)/g);
    
    const parsed = rawSegments.map(seg => {
      if (seg.startsWith('<b>')) return { text: seg.replace(/<\/?b>/g, ''), type: 'bold' };
      if (seg.startsWith('<i>')) return { text: seg.replace(/<\/?i>/g, ''), type: 'italic' };
      return { text: seg, type: 'normal' };
    }).filter(s => s.text.length > 0);

    setSegments(parsed);
    setVisibleCount(0);
  }, [text]);

  // Typing animation interval
  useEffect(() => {
    if (segments.length === 0) return;
    const totalChars = segments.reduce((acc, seg) => acc + seg.text.length, 0);

    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev < totalChars) {
          if (prev % 2 === 0) SoundEngine.playType();
          return prev + 1;
        } else {
          clearInterval(timer);
          // FIX: Do NOT call onComplete here inside the setState updater
          return prev;
        }
      });
    }, speed);

    return () => clearInterval(timer);
  }, [segments, speed]);

  // Monitor completion separately
  useEffect(() => {
    if (segments.length === 0) return;
    const totalChars = segments.reduce((acc, seg) => acc + seg.text.length, 0);
    
    // Only trigger if we have text and have reached the end
    if (totalChars > 0 && visibleCount >= totalChars) {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }
  }, [visibleCount, segments]);

  let charCounter = 0;
  return (
    <span>
      {segments.map((seg, i) => {
        const start = charCounter;
        charCounter += seg.text.length;
        if (visibleCount < start) return null;
        const textSlice = seg.text.slice(0, Math.min(visibleCount - start, seg.text.length));

        if (seg.type === 'bold') return <b key={i} className="text-amber-300 font-bold">{textSlice}</b>;
        if (seg.type === 'italic') return <i key={i} className="text-sky-300 italic">{textSlice}</i>;
        return <span key={i}>{textSlice}</span>;
      })}
    </span>
  );
};

export { Typewriter };
