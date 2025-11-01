import React, { useMemo, useRef, useEffect, useState } from 'react';
import { TimedLyric } from '../types';
import { ColorPalette } from '../styles/colors';

interface TurntableLyricsProps {
  timedLyrics: TimedLyric[];
  activeIndex: number;
  colorPalette: ColorPalette;
  isPlaying: boolean;
}

const TurntableLyrics: React.FC<TurntableLyricsProps> = ({ timedLyrics, activeIndex, colorPalette, isPlaying }) => {
  const lyricData = useMemo(() => {
    // Add padding to allow first and last lyrics to reach the center
    const padding = ' '.repeat(50);
    const fullText = padding + timedLyrics.map(l => l.text).join('   ') + padding;
    const positions = timedLyrics.reduce((acc, lyric) => {
      const lastPos = acc.length > 0 ? acc[acc.length - 1].end : 0;
      // Start position accounts for padding and spaces
      const start = (lastPos === 0 ? padding.length : lastPos + 3);
      const end = start + lyric.text.length;
      acc.push({ start, end });
      return acc;
    }, [] as {start: number, end: number}[]);

    return { fullText, positions };
  }, [timedLyrics]);

  const [startOffset, setStartOffset] = useState(50);

  useEffect(() => {
    if (activeIndex !== -1 && lyricData.fullText.length > 0) {
      const activePos = lyricData.positions[activeIndex];
      const midCharIndex = activePos.start + (activePos.end - activePos.start) / 2;
      const targetOffset = 50 - (midCharIndex / lyricData.fullText.length) * 100;
      setStartOffset(targetOffset);
    } else if (activeIndex === -1) {
        // Before the song starts, center the beginning of the text
        const targetOffset = 50 - (lyricData.positions[0].start / lyricData.fullText.length) * 100;
        setStartOffset(targetOffset);
    }
  }, [activeIndex, lyricData]);


  const FONT_SIZE = 1.4;
  const RADIUS = 22; // in em
  const VIEWBOX_SIZE = RADIUS * 2.2;
  const PATH_LENGTH_APPROX = RADIUS * Math.PI * 1.5; // For arc length calculation

  const { fullText, positions } = lyricData;
  const activePos = activeIndex !== -1 ? positions[activeIndex] : null;

  return (
    <div className="w-full h-full flex items-center justify-center">
        <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full max-w-[90vh] max-h-[90vh]" style={{ fontSize: `${FONT_SIZE}rem` }}>
        <defs>
          <path
            id="lyric-path"
            fill="none"
            d={`
              M ${VIEWBOX_SIZE * 0.1}, ${VIEWBOX_SIZE / 2}
              A ${RADIUS},${RADIUS} 0 1,1 ${VIEWBOX_SIZE * 0.9}, ${VIEWBOX_SIZE / 2}
            `}
          />
        </defs>
        
        {/* Disc background - static for clarity */}
        <g transform={`translate(${VIEWBOX_SIZE/2} ${VIEWBOX_SIZE/2})`}>
            <circle cx="0" cy="0" r={RADIUS * 0.95} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <circle cx="0" cy="0" r={RADIUS * 0.93} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
            <circle cx="0" cy="0" r={RADIUS * 0.4} fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
            <circle cx="0" cy="0" r={RADIUS * 0.38} fill="rgba(0,0,0,0.5)" />
        </g>
        
        {/* Text on path */}
        <text textAnchor="middle" style={{ fontSize: '1em', letterSpacing: '0.1em' }} fill={colorPalette.base}>
            <textPath 
              href="#lyric-path" 
              startOffset={`${startOffset}%`}
              style={{ transition: 'start-offset 0.8s cubic-bezier(0.65, 0, 0.35, 1)' }}
            >
              {activePos ? (
                <>
                  <tspan>{fullText.substring(0, activePos.start)}</tspan>
                  <tspan fill={colorPalette.highlight} fontWeight="bold">{fullText.substring(activePos.start, activePos.end)}</tspan>
                  <tspan>{fullText.substring(activePos.end)}</tspan>
                </>
              ) : (
                <tspan>{fullText}</tspan>
              )}
            </textPath>
        </text>
        
        {/* Top indicator / needle */}
        <g transform={`translate(${VIEWBOX_SIZE/2}, ${VIEWBOX_SIZE/2 - RADIUS})`}>
          <path d="M 0 -3 L 3 0 L 0 3 L -3 0 Z" fill={colorPalette.highlight} />
          <rect x="-0.5" y="-14" width="1" height="12" fill={colorPalette.highlight} opacity="0.5" />
        </g>
      </svg>
    </div>
  );
};

export default TurntableLyrics;
