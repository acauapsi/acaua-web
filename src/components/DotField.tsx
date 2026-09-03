import React, { useEffect, useRef } from 'react';

interface DotFieldProps {
  dotColorDark?: string;
  dotColorLight?: string;
  glowColorDark?: string;
  glowColorLight?: string;
  spacing?: number;
  dotSize?: number;
}

export const DotField: React.FC<DotFieldProps> = ({
  dotColorDark  = 'rgba(77, 150, 150, 0.15)',   // Subtle slate teal dots on dark petrol
  dotColorLight = 'rgba(45, 112, 112, 0.12)',   // Subtle teal dots on cream
  glowColorDark = 'rgba(197, 222, 222, 0.8)',   // Glowing crisp cream/cyan on hover
  glowColorLight = 'rgba(45, 112, 112, 0.65)',
  spacing = 28,
  dotSize = 1.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx= canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x= e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const isDarkMode = document.documentElement.classList.contains('dark');
      const baseDotColor = isDarkMode ? dotColorDark : dotColorLight;
      const activeGlowColor = isDarkMode ? glowColorDark : glowColorLight;

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const hoverRadius = 140;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x= i * spacing;
          const y = j * spacing;

          const dx= x- mouseX;
          const dy = y - mouseY;
          const dist = Math.sqrt(dx* dx+ dy * dy);

          let currentSize = dotSize;
          let color = baseDotColor;

          if (mouseRef.current.active && dist < hoverRadius) {
            const factor = 1 - dist / hoverRadius;
            currentSize = dotSize + factor * 2.2;
            ctx.shadowBlur = factor * 8;
            ctx.shadowColor = isDarkMode ? 'rgba(114, 176, 176, 0.5)' : 'rgba(45, 112, 112, 0.4)';
            color = activeGlowColor;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          ctx.arc(x, y, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotColorDark, dotColorLight, glowColorDark, glowColorLight, spacing, dotSize]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 opacity-70 dark:opacity-80"
    />
  );
};
