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
    let maxFrameDelta = 0;
    let lastBoostTime = 0;
    let animationFrameId: number;
    let calibratedMaxFps = 0;

    const checkPerformance = (now: number) => {
      frameCount++;
      const frameDelta = now - (lastTime || now);
      totalFrameTime += frameDelta;
      if (frameDelta > maxFrameDelta) {
        maxFrameDelta = frameDelta;
      }

      // Sample metrics every 400ms for stable feedback
      if (now - lastTime >= 400) {
        const elapsed = now - lastTime;
        if (elapsed > 1500) {
          // Discard sample if gap is unusually large due to background tab sleep/freeze
          frameCount = 0;
          totalFrameTime = 0;
          maxFrameDelta = 0;
          lastTime = now;
          animationFrameId = requestAnimationFrame(checkPerformance);
          return;
        }

        const measuredFps = Math.round((frameCount * 1000) / elapsed);
        if (measuredFps > calibratedMaxFps) {
          calibratedMaxFps = measuredFps;
        }

        const currentFps = Math.min(144, measuredFps);
        const avgFrameTime = totalFrameTime / frameCount;

        // Adapt target FPS to display capability (e.g., 60, 90, 120, 144) to prevent false-boost loops on 60Hz displays
        const requestedTarget = targetFpsRef.current || 90;
        const effectiveTarget = calibratedMaxFps > 0 
          ? Math.min(requestedTarget, calibratedMaxFps > 100 ? 120 : (calibratedMaxFps > 75 ? 90 : 60))
          : requestedTarget;

        const targetFrameTime = 1000 / Math.max(30, effectiveTarget);
        const lowFpsThreshold = Math.round(effectiveTarget * 0.78);
        const highFpsThreshold = Math.round(effectiveTarget * 0.90);
        const maxBudgetMs = targetFrameTime * 1.30; // Frame budget threshold

        let boostActive = document.body.classList.contains('perf-boost');

        const isSpike = maxFrameDelta > Math.max(35, targetFrameTime * 2.2);
        const isLagging = currentFps < lowFpsThreshold || avgFrameTime > maxBudgetMs;

        if (isSpike || isLagging) {
          lowFpsCount++;
          highFpsCount = 0;
          // Trigger immediately on severe spike or after 2 consecutive low samples
          if ((isSpike || lowFpsCount >= 2) && !boostActive) {
            document.body.classList.add('perf-boost');
            boostActive = true;
            lastBoostTime = now;
            console.warn(`[90 FPS Engine] High-load frame drop detected (${currentFps} FPS on ${effectiveTarget}Hz target, avg ${avgFrameTime.toFixed(1)}ms). Hardware acceleration active.`);
          }
        } else if (currentFps >= highFpsThreshold && avgFrameTime <= targetFrameTime * 1.1) {
          highFpsCount++;
          lowFpsCount = 0;
          // Apply 3.0s cooldown to prevent layer flapping and frame stuttering during recovery
          if (highFpsCount >= 5 && boostActive && (now - lastBoostTime > 3000)) {
            document.body.classList.remove('perf-boost');
            boostActive = false;
            console.info(`[90 FPS Engine] Frame rate sustained at target (${currentFps} FPS). 'perf-boost' deactivated.`);
          }
        }

        setMetrics({
          fps: currentFps,
          targetFps: effectiveTarget,
          isBoostActive: boostActive,
          frameDropCount: lowFpsCount,
          avgFrameTimeMs: Math.round(avgFrameTime * 10) / 10,
        });

        frameCount = 0;
        totalFrameTime = 0;
        maxFrameDelta = 0;
        lastTime = now;
      }

      animationFrameId = requestAnimationFrame(checkPerformance);
    };

    animationFrameId = requestAnimationFrame(checkPerformance);

    // Tab visibility & focus handling to avoid false drops upon tab switching
    const handleVisibilityChange = () => {
      lastTime = performance.now();
      frameCount = 0;
      totalFrameTime = 0;
      maxFrameDelta = 0;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

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

