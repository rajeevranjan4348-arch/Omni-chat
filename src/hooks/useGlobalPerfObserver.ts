import { useEffect, useState, useRef } from 'react';

export interface PerfMetrics {
  fps: number;
  targetFps: number;
  isBoostActive: boolean;
  frameDropCount: number;
  avgFrameTimeMs: number;
}

export function useGlobalPerfObserver(initialTargetFps: number = 90) {
  const [metrics, setMetrics] = useState<PerfMetrics>({
    fps: 90,
    targetFps: initialTargetFps,
    isBoostActive: false,
    frameDropCount: 0,
    avgFrameTimeMs: 11.1, // 1000/90 = ~11.1ms per frame for 90 FPS
  });

  const [targetFps, setTargetFps] = useState<number>(initialTargetFps);
  const targetFpsRef = useRef<number>(initialTargetFps);

  useEffect(() => {
    targetFpsRef.current = targetFps;
  }, [targetFps]);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let lowFpsCount = 0;
    let highFpsCount = 0;
    let totalFrameTime = 0;
    let lastBoostTime = 0;
    let animationFrameId: number;

    const checkPerformance = (now: number) => {
      frameCount++;
      const frameDelta = now - (lastTime || now);
      totalFrameTime += frameDelta;

      // Sample metrics every 400ms for stable feedback
      if (now - lastTime >= 400) {
        const elapsed = now - lastTime;
        if (elapsed > 1500) {
          // Discard sample if gap is unusually large due to background tab sleep/freeze
          frameCount = 0;
          totalFrameTime = 0;
          lastTime = now;
          animationFrameId = requestAnimationFrame(checkPerformance);
          return;
        }

        const currentFps = Math.min(120, Math.round((frameCount * 1000) / elapsed));
        const avgFrameTime = totalFrameTime / frameCount;

        frameCount = 0;
        totalFrameTime = 0;
        lastTime = now;

        const target = targetFpsRef.current || 90;
        // Trigger hardware acceleration when frames drop below 78% of 90 FPS target (~70 FPS) or frame budget exceeded (>14.5ms)
        const lowFpsThreshold = Math.round(target * 0.78);
        const highFpsThreshold = Math.round(target * 0.90);

        let boostActive = document.body.classList.contains('perf-boost');

        if (currentFps < lowFpsThreshold || avgFrameTime > 14.5) {
          lowFpsCount++;
          highFpsCount = 0;
          if (lowFpsCount >= 2 && !boostActive) {
            document.body.classList.add('perf-boost');
            boostActive = true;
            lastBoostTime = now;
            console.warn(`[90 FPS Engine] Frame drops detected (${currentFps} FPS, ${avgFrameTime.toFixed(1)}ms). 'perf-boost' hardware acceleration active.`);
          }
        } else if (currentFps >= highFpsThreshold && avgFrameTime <= 12.0) {
          highFpsCount++;
          lowFpsCount = 0;
          // Apply minimum 2.5s cooldown to prevent frame stuttering and layer flapping
          if (highFpsCount >= 5 && boostActive && (now - lastBoostTime > 2500)) {
            document.body.classList.remove('perf-boost');
            boostActive = false;
            console.info(`[90 FPS Engine] Frame rate sustained at 90 FPS target (${currentFps} FPS). 'perf-boost' deactivated.`);
          }
        }

        setMetrics({
          fps: currentFps,
          targetFps: target,
          isBoostActive: boostActive,
          frameDropCount: lowFpsCount,
          avgFrameTimeMs: Math.round(avgFrameTime * 10) / 10,
        });
      }

      animationFrameId = requestAnimationFrame(checkPerformance);
    };

    animationFrameId = requestAnimationFrame(checkPerformance);

    // Tab visibility handling to avoid false drops upon tab switching
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastTime = performance.now();
        frameCount = 0;
        totalFrameTime = 0;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // LongTask PerformanceObserver
    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 45) {
              lastBoostTime = performance.now();
              if (!document.body.classList.contains('perf-boost')) {
                document.body.classList.add('perf-boost');
                console.warn(`[90 FPS Engine] CPU spike (${Math.round(entry.duration)}ms). 'perf-boost' triggered.`);
              }
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Safe catch
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) observer.disconnect();
    };
  }, []);

  return {
    metrics,
    targetFps,
    setTargetFps,
  };
}

