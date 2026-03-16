'use client';

import { useEffect, useState, useRef } from 'react';

interface HeatmapLoaderProps {
  title?: string;
  subtitle?: string;
  showCheckmark?: boolean;
}

const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

const MESSAGES = [
  "Analyzing your repository...",
  "Scanning locale files...",
  "Parsing translation keys...",
  "Calculating coverage...",
  "Scoring translation quality...",
  "Checking for missing keys...",
  "Building heatmap data...",
];

export default function HeatmapLoader({ 
  title = "Analyzing your repository",
  subtitle = "This may take a moment...",
  showCheckmark = false,
}: HeatmapLoaderProps) {
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());
  const [messageIndex, setMessageIndex] = useState(0);
  const [cellStates, setCellStates] = useState<Map<number, 'red' | 'yellow' | 'green'>>(new Map());
  const [allGreen, setAllGreen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const animate = () => {
      const newCells = new Set<number>();
      const numActive = Math.floor(Math.random() * 20) + 12;
      for (let i = 0; i < numActive; i++) {
        newCells.add(Math.floor(Math.random() * CELL_COUNT));
      }
      setActiveCells(newCells);
      
      setCellStates(prev => {
        const next = new Map(prev);
        for (let i = 0; i < CELL_COUNT; i++) {
          const rand = Math.random();
          if (rand < 0.35) next.set(i, 'red');
          else if (rand < 0.65) next.set(i, 'yellow');
          else next.set(i, 'green');
        }
        return next;
      });
      
      setMessageIndex(prev => (prev + 1) % MESSAGES.length);
    };

    const startDelay = setTimeout(() => {
      intervalRef.current = setInterval(animate, 500);
    }, 200);

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (showCheckmark) {
      const greenInterval = setInterval(() => {
        setCellStates(prev => {
          const next = new Map(prev);
          let changed = false;
          let greenCount = 0;
          for (let i = 0; i < CELL_COUNT; i++) {
            const current = next.get(i) || 'yellow';
            if (current !== 'green') {
              const rand = Math.random();
              if (rand < 0.25) {
                next.set(i, 'green');
                changed = true;
              }
            } else {
              greenCount++;
            }
          }
          // Check if all green
          if (greenCount >= CELL_COUNT - 1) {
            // Make remaining cells green
            for (let i = 0; i < CELL_COUNT; i++) {
              next.set(i, 'green');
            }
            setAllGreen(true);
          }
          return changed ? next : prev;
        });
      }, 80);
      
      return () => clearInterval(greenInterval);
    } else {
      setAllGreen(false);
    }
  }, [showCheckmark]);

  const getCellColor = (index: number) => {
    if (!activeCells.has(index)) return 'rgba(255,255,255,0.05)';
    
    const state = cellStates.get(index);
    if (state === 'green') return 'var(--accent)';
    if (state === 'yellow') return '#fbbf24';
    return '#f87171';
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      gap: 20,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0,
      animation: 'fadeIn 0.3s ease forwards',
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: 4,
      }}>
        {Array.from({ length: CELL_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 40,
              height: 40,
              borderRadius: 4,
              background: getCellColor(i),
              transition: 'background 0.25s ease',
              boxShadow: activeCells.has(i) ? `0 0 8px ${getCellColor(i)}50` : 'none',
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <style>{`
          @keyframes textFade {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {allGreen && (
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(63,200,222,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'textFade 0.4s ease forwards',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
        <h2 key={messageIndex} style={{ 
          fontSize: 15, 
          fontWeight: 600, 
          color: allGreen ? 'var(--success)' : 'var(--text-1)', 
          margin: 0,
          animation: 'textFade 0.3s ease forwards',
        }}>
          {allGreen ? 'Analysis complete!' : MESSAGES[messageIndex]}
        </h2>
        {!allGreen && (
          <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
