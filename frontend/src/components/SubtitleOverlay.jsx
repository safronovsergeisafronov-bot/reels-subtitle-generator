import React, { memo, useState, useCallback, useRef } from 'react';

const SubtitleOverlay = memo(({
  subtitles,
  currentTime,
  subtitleStyles,
  scaleFactor,
  activeTab,
  videoDimensions,
  onUpdateStyles,
}) => {
  const [snapGuides, setSnapGuides] = useState({ x: false, y: false });
  const dragRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (activeTab !== 'style' || e.button !== 0) return;
    // Record starting mouse position and current subtitle position for relative drag
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: subtitleStyles.position.x,
      startPosY: subtitleStyles.position.y,
    };
  }, [activeTab, subtitleStyles.position]);

  const handleMouseMove = useCallback((e) => {
    if (e.buttons !== 1 || activeTab !== 'style' || !dragRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const deltaMouseX = e.clientX - dragRef.current.startMouseX;
    const deltaMouseY = e.clientY - dragRef.current.startMouseY;

    // Convert pixel delta to video coordinate delta
    const deltaX = (deltaMouseX / rect.width) * videoDimensions.width;
    const deltaY = -(deltaMouseY / rect.height) * videoDimensions.height;

    let x = Math.round(dragRef.current.startPosX + deltaX);
    let y = Math.round(dragRef.current.startPosY + deltaY);

    const SNAP = 30;
    const snappedX = Math.abs(x) < SNAP;
    const snappedY = Math.abs(y) < SNAP;
    if (snappedX) x = 0;
    if (snappedY) y = 0;
    setSnapGuides({ x: snappedX, y: snappedY });

    onUpdateStyles(prev => ({ ...prev, position: { x, y } }));
  }, [activeTab, videoDimensions, onUpdateStyles]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setSnapGuides({ x: false, y: false });
  }, []);

  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ pointerEvents: activeTab === 'style' ? 'auto' : 'none' }}
    >
      {snapGuides.x && (
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-400/80 z-30 pointer-events-none" />
      )}
      {snapGuides.y && (
        <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-400/80 z-30 pointer-events-none" />
      )}
      {subtitles.map((sub, idx) => {
        const isActive = currentTime >= sub.start && currentTime <= sub.end;
        if (!isActive) return null;
        return (
          <div
            key={idx}
            className={`absolute text-center select-none ${activeTab === 'style' ? 'cursor-move ring-1 ring-blue-500/50 rounded p-1' : ''}`}
            style={{
              left: `calc(50% + ${subtitleStyles.position.x * scaleFactor}px)`,
              top: `calc(50% - ${subtitleStyles.position.y * scaleFactor}px)`,
              transform: 'translate(-50%, -50%)',
              fontFamily: `'${subtitleStyles.fontFamily}', sans-serif`,
              fontSize: `${subtitleStyles.fontSize * scaleFactor}px`,
              color: subtitleStyles.textColor,
              textTransform: subtitleStyles.uppercase ? 'uppercase' : 'none',
              fontWeight: subtitleStyles.bold ? 'bold' : 'normal',
              paintOrder: 'stroke fill',
              WebkitTextStroke: `${subtitleStyles.outlineWidth * scaleFactor * 0.5}px ${subtitleStyles.outlineColor || '#000000'}`,
              textShadow: subtitleStyles.shadowDepth > 0
                ? `${subtitleStyles.shadowDepth * scaleFactor}px ${subtitleStyles.shadowDepth * scaleFactor}px ${subtitleStyles.shadowDepth * scaleFactor * 0.5}px ${subtitleStyles.outlineColor || '#000000'}`
                : 'none',
              lineHeight: 1.2,
              width: '80%',
              whiteSpace: 'pre-wrap'
            }}
          >
            {subtitleStyles.karaokeEnabled && sub.words?.length ? (() => {
              const MIN_HL = 0.2; // 200ms minimum highlight
              let highlightIdx = -1;
              for (let i = 0; i < sub.words.length; i++) {
                const w = sub.words[i];
                const nextStart = i < sub.words.length - 1 ? sub.words[i + 1].start : sub.end;
                const effectiveEnd = Math.min(Math.max(w.end, w.start + MIN_HL), nextStart);
                if (currentTime >= w.start && currentTime < effectiveEnd) {
                  highlightIdx = i;
                  break;
                }
              }
              return sub.words.map((word, i) => (
                <span key={i} style={{
                  color: i === highlightIdx ? subtitleStyles.highlightColor : subtitleStyles.textColor,
                  transition: 'color 0.05s',
                  textTransform: subtitleStyles.uppercase ? 'uppercase' : 'none',
                }}>
                  {word.word}{i < sub.words.length - 1 ? ' ' : ''}
                </span>
              ));
            })() : (
              subtitleStyles.uppercase ? sub.text.toUpperCase() : sub.text
            )}
          </div>
        );
      })}
    </div>
  );
});

SubtitleOverlay.displayName = 'SubtitleOverlay';

export default SubtitleOverlay;
