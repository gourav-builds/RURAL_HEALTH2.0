import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  className?: string;
}

export function AudioWaveform({ isRecording, className = '' }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    const barCount = 32;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isRecording) {
          const wave1 = Math.sin(phase * 0.15 + i * 0.35);
          const wave2 = Math.cos(phase * 0.08 + i * 0.2);
          barHeight = Math.max(4, Math.abs(wave1 * wave2) * (height * 0.85));
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isRecording) {
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(0.5, '#0ea5e9');
          gradient.addColorStop(1, '#0284c7');
        } else {
          gradient.addColorStop(0, '#475569');
          gradient.addColorStop(1, '#334155');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isRecording) {
        phase++;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={36}
      className={`rounded-lg bg-slate-50/60 border border-slate-200 ${className}`}
    />
  );
}
