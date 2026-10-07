'use client'

import React, { useEffect, useRef } from 'react'
import { BloopState, type OrbBloopProps } from './types'
import { useOrbAudio } from '../smooth/use-orb-audio'
import { BLOOP_WGSL } from './bloop.wgsl'

export function OrbBloop({
  audioMode = 'ambient',
  demoMode = false,
  audioElement,
  audioSrc,
  state = BloopState.idle,
  bloopColorMain = [0.1, 0.5, 1.0],
  bloopColorLow = [0.1, 0.2, 0.8],
  bloopColorMid = [0.2, 0.4, 0.9],
  bloopColorHigh = [0.5, 0.8, 1.0],
  size = 144,
  watercolorStrength = 0.5,
  watercolorAnimated = false,
  className = '',
  style,
}: OrbBloopProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioAnalyzerRef = useOrbAudio(audioMode, audioElement, audioSrc)
  const startTime = useRef(Date.now())
  const stateTrackingRef = useRef({ current: state, enteredAt: 0 })
  const audioAverageRef = useRef([0, 0, 0, 0])
  const cumulativeAudioRef = useRef([0, 0, 0, 0])
  const lastTimeRef = useRef(Date.now())
  const propsRef = useRef({
    state,
    audioMode,
    demoMode,
    bloopColorMain,
    bloopColorLow,
    bloopColorMid,
    bloopColorHigh,
    watercolorStrength,
    watercolorAnimated,
  })
  propsRef.current = {
    state,
    audioMode,
    demoMode,
    bloopColorMain,
    bloopColorLow,
    bloopColorMid,
    bloopColorHigh,
    watercolorStrength,
    watercolorAnimated,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let stop: (() => void) | undefined
    let disposeGpu: (() => void) | undefined

    const run2dFallback = () => {
      const currentCanvas = canvasRef.current
      if (cancelled || !currentCanvas) return
      const ctx = currentCanvas.getContext('2d')
      if (!ctx) return

      let animId: number

      const toRgba = (c: [number, number, number], a: number = 1) =>
        `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`

      const render2D = () => {
        if (cancelled || !canvasRef.current) return
        const now = Date.now()
        const time = (now - startTime.current) / 1000
        const p = propsRef.current
        const activeState = p.state
        if (stateTrackingRef.current.current !== activeState) {
          stateTrackingRef.current.current = activeState
          stateTrackingRef.current.enteredAt = time
        }
        const enteredAt = stateTrackingRef.current.enteredAt

        let avg = [0, 0, 0, 0]
        let micLevel = 0
        if (audioAnalyzerRef.current) {
          audioAnalyzerRef.current.update()
          const a = audioAnalyzerRef.current
          avg = [a.allAvg / 255, a.lowAvg / 255, a.midAvg / 255, a.highAvg / 255]
          micLevel = avg[0]
        } else if (p.demoMode) {
          const stateTime = time - enteredAt
          if (activeState === BloopState.speak) {
            const wordRhythm = Math.sin(stateTime * 4.2) * 0.5 + 0.5
            const syllable = Math.sin(stateTime * 14.8) * 0.5 + 0.5
            const burst = Math.pow(syllable * wordRhythm, 1.4)
            const low = Math.min(1.0, 0.28 + burst * 0.65 + Math.sin(stateTime * 7.0) * 0.12)
            const mid = Math.min(1.0, 0.22 + (Math.sin(stateTime * 11.5) * 0.5 + 0.5) * 0.62)
            const high = Math.min(1.0, 0.16 + (Math.sin(stateTime * 28.0) * 0.5 + 0.5) * 0.42)
            micLevel = Math.min(1.0, low * 0.5 + mid * 0.35 + high * 0.15)
            avg = [micLevel, low, mid, high]
          } else if (activeState === BloopState.listen) {
            const wave = Math.sin(stateTime * 3.0) * 0.5 + 0.5
            const pulse = Math.sin(stateTime * 8.2) * 0.15 + 0.15
            micLevel = 0.2 + wave * 0.35 + pulse
            avg = [micLevel, micLevel * 0.65, micLevel * 0.85, micLevel * 0.45]
          } else if (activeState === BloopState.think) {
            const breath = Math.sin(time * 3.6) * 0.5 + 0.5
            micLevel = 0.16 + breath * 0.26
            avg = [micLevel, micLevel * 0.45, micLevel * 0.85, micLevel * 0.35]
          } else {
            micLevel = Math.sin(time * 1.8) * 0.06 + 0.06
            avg = [micLevel, micLevel * 0.5, micLevel * 0.35, micLevel * 0.2]
          }
        } else if (p.audioMode === 'ambient') {
          micLevel = Math.sin(time * 2.0) * 0.1 + 0.1
          avg = [micLevel, micLevel * 0.6, micLevel * 0.4, micLevel]
        }

        const dt = Math.min(now - lastTimeRef.current, 100) / 1000
        lastTimeRef.current = now
        for (let i = 0; i < 4; i++) {
          audioAverageRef.current[i] += (avg[i] - audioAverageRef.current[i]) * 0.55
          cumulativeAudioRef.current[i] += audioAverageRef.current[i] * (60 * dt) * 0.25
        }

        const width = 512
        const height = 512
        const cx = width / 2
        const cy = height / 2

        ctx.clearRect(0, 0, width, height)

        const baseRadius = 140
        const pulse = 1 + micLevel * 0.4 + Math.sin(time * 2.5) * 0.04
        const radius = baseRadius * pulse

        // Outer soft ambient aura
        const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.6)
        auraGrad.addColorStop(0, toRgba(p.bloopColorMain, 0.45))
        auraGrad.addColorStop(0.5, toRgba(p.bloopColorLow, 0.25))
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = auraGrad
        ctx.beginPath()
        ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2)
        ctx.fill()

        // Organic undulating blob outer shell
        ctx.save()
        ctx.beginPath()
        const points = 36
        for (let j = 0; j <= points; j++) {
          const angle = (j / points) * Math.PI * 2
          const wave1 = Math.sin(angle * 3 + time * 2.2) * 16 * (1 + micLevel * 1.5)
          const wave2 = Math.cos(angle * 5 - time * 1.7) * 10 * (1 + avg[1] * 1.2)
          const r = radius + wave1 + wave2
          const px = cx + Math.cos(angle) * r
          const py = cy + Math.sin(angle) * r
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()

        const blobGrad = ctx.createRadialGradient(
          cx - radius * 0.25,
          cy - radius * 0.25,
          radius * 0.1,
          cx,
          cy,
          radius * 1.15
        )
        blobGrad.addColorStop(0, toRgba(p.bloopColorHigh, 0.95))
        blobGrad.addColorStop(0.35, toRgba(p.bloopColorMid, 0.85))
        blobGrad.addColorStop(0.75, toRgba(p.bloopColorMain, 0.75))
        blobGrad.addColorStop(1, toRgba(p.bloopColorLow, 0.3))
        ctx.fillStyle = blobGrad
        ctx.fill()
        ctx.restore()

        // Inner glowing core
        const coreRadius = radius * 0.65
        const coreGrad = ctx.createRadialGradient(
          cx - coreRadius * 0.2,
          cy - coreRadius * 0.2,
          0,
          cx,
          cy,
          coreRadius
        )
        coreGrad.addColorStop(0, toRgba(p.bloopColorHigh, 0.9))
        coreGrad.addColorStop(0.5, toRgba(p.bloopColorMid, 0.7))
        coreGrad.addColorStop(1, toRgba(p.bloopColorMain, 0.1))
        ctx.fillStyle = coreGrad
        ctx.beginPath()
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2)
        ctx.fill()

        // State-specific visual flourish
        if (activeState === BloopState.think) {
          // Spinning orbital processing rings
          ctx.save()
          ctx.strokeStyle = toRgba(p.bloopColorHigh, 0.6)
          ctx.lineWidth = 3
          ctx.setLineDash([12, 18])
          ctx.beginPath()
          ctx.arc(cx, cy, radius * 1.15, time * 2, time * 2 + Math.PI * 1.6)
          ctx.stroke()
          ctx.restore()
        } else if (activeState === BloopState.listen) {
          // Responsive listener ripple
          ctx.save()
          ctx.strokeStyle = toRgba(p.bloopColorHigh, 0.5 + Math.sin(time * 6) * 0.3)
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(cx, cy, radius * (1.1 + Math.sin(time * 4) * 0.08), 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        animId = requestAnimationFrame(render2D)
      }

      animId = requestAnimationFrame(render2D)
      stop = () => cancelAnimationFrame(animId)
    }

    async function mount() {
      const currentCanvas = canvasRef.current
      if (cancelled || !currentCanvas) return

      // Check if WebGPU is available in browser and has a usable adapter
      if (typeof navigator === 'undefined' || !('gpu' in navigator) || !navigator.gpu) {
        run2dFallback()
        return
      }

      try {
        // Pre-verify adapter to avoid throwing unhandled VGPUError when WebGPU is disabled or headless
        const gpuObj = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu
        const adapter = await gpuObj?.requestAdapter?.().catch(() => null)
        if (!adapter || cancelled) {
          run2dFallback()
          return
        }

        const { init, effect, surface, frameLoop } = await import('vgpu')
        const gpu = await init()
        if (cancelled || !canvasRef.current) {
          gpu?.dispose?.()
          return
        }

        const canvasSurface = surface(gpu, currentCanvas, {
          format: 'bgra8unorm',
          alphaMode: 'premultiplied',
        })
        const fx = effect(gpu, BLOOP_WGSL, { blend: 'premultiplied' })
        let lastDraw = 0
        const loop = frameLoop(gpu, (frame) => {
          if (document.visibilityState === 'hidden') return
          const now = Date.now()
          lastDraw = now
          const time = (now - startTime.current) / 1000
          const p = propsRef.current
          const activeState = p.state
          if (stateTrackingRef.current.current !== activeState) {
            stateTrackingRef.current.current = activeState
            stateTrackingRef.current.enteredAt = time
          }
          const enteredAt = stateTrackingRef.current.enteredAt

          let avg = [0, 0, 0, 0]
          let micLevel = 0
          if (audioAnalyzerRef.current) {
            audioAnalyzerRef.current.update()
            const a = audioAnalyzerRef.current
            avg = [a.allAvg / 255, a.lowAvg / 255, a.midAvg / 255, a.highAvg / 255]
            micLevel = avg[0]
          } else if (p.demoMode) {
            const stateTime = time - enteredAt
            if (activeState === BloopState.speak) {
              const wordRhythm = Math.sin(stateTime * 4.2) * 0.5 + 0.5
              const syllable = Math.sin(stateTime * 14.8) * 0.5 + 0.5
              const microJitter = Math.sin(stateTime * 28.0) * 0.5 + 0.5
              const burst = Math.pow(syllable * wordRhythm, 1.4)

              const low = Math.min(1.0, 0.28 + burst * 0.65 + Math.sin(stateTime * 7.0) * 0.12)
              const mid = Math.min(1.0, 0.22 + (Math.sin(stateTime * 11.5) * 0.5 + 0.5) * 0.62)
              const high = Math.min(1.0, 0.16 + microJitter * 0.42)
              micLevel = Math.min(1.0, low * 0.5 + mid * 0.35 + high * 0.15)
              avg = [micLevel, low, mid, high]
            } else if (activeState === BloopState.listen) {
              const wave = Math.sin(stateTime * 3.0) * 0.5 + 0.5
              const pulse = Math.sin(stateTime * 8.2) * 0.15 + 0.15
              micLevel = 0.2 + wave * 0.35 + pulse
              avg = [micLevel, micLevel * 0.65, micLevel * 0.85, micLevel * 0.45]
            } else if (activeState === BloopState.think) {
              const breath = Math.sin(time * 3.6) * 0.5 + 0.5
              micLevel = 0.16 + breath * 0.26
              avg = [micLevel, micLevel * 0.45, micLevel * 0.85, micLevel * 0.35]
            } else {
              micLevel = Math.sin(time * 1.8) * 0.06 + 0.06
              avg = [micLevel, micLevel * 0.5, micLevel * 0.35, micLevel * 0.2]
            }
          } else if (p.audioMode === 'ambient') {
            micLevel = Math.sin(time * 2.0) * 0.1 + 0.1
            avg = [micLevel, micLevel * 0.6, micLevel * 0.4, micLevel]
          }
          const dt = Math.min(now - lastTimeRef.current, 100) / 1000
          lastTimeRef.current = now
          for (let i = 0; i < 4; i++) {
            audioAverageRef.current[i] += (avg[i] - audioAverageRef.current[i]) * 0.55
            cumulativeAudioRef.current[i] += audioAverageRef.current[i] * (60 * dt) * 0.25
          }

          fx.set({
            ubo: {
              time,
              micLevel,
              stateListen: activeState === BloopState.listen ? 1 : 0,
              listenTimestamp: activeState === BloopState.listen ? enteredAt : 0,
              stateThink: activeState === BloopState.think ? 1 : 0,
              thinkTimestamp: activeState === BloopState.think ? enteredAt : 0,
              stateSpeak: activeState === BloopState.speak ? 1 : 0,
              speakTimestamp: activeState === BloopState.speak ? enteredAt : 0,
              avgMag: audioAverageRef.current,
              cumulativeAudio: cumulativeAudioRef.current,
              viewport: [canvasRef.current?.width || size, canvasRef.current?.height || size],
              watercolorStrength: p.watercolorStrength,
              watercolorAnimated: 0,
              bloopColorMain: [...p.bloopColorMain, 1],
              bloopColorLow: [...p.bloopColorLow, 1],
              bloopColorMid: [...p.bloopColorMid, 1],
              bloopColorHigh: [...p.bloopColorHigh, 1],
            },
          })
          frame.pass({ target: canvasSurface, clear: [0, 0, 0, 0] }, fx)
        })
        stop = () => loop.stop()
        disposeGpu = () => gpu.dispose()
      } catch (err) {
        // Gracefully fallback to high-fidelity 2D canvas without error logging
        run2dFallback()
      }
    }

    mount().catch(() => {
      run2dFallback()
    })

    return () => {
      cancelled = true
      stop?.()
      disposeGpu?.()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      className={`aspect-square ${className}`.trim()}
      style={{
        width: size !== undefined ? `${size}px` : '100%',
        height: size !== undefined ? `${size}px` : '100%',
        ...style,
      }}
    />
  )
}
