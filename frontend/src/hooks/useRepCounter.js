
import { useEffect, useRef, useState } from "react"
import { Accelerometer } from "expo-sensors"

function mag(x, y, z) { return Math.sqrt(x*x + y*y + z*z) }
function dot(ax, ay, az, bx, by, bz) { return ax*bx + ay*by + az*bz }
function angleBetween(ax, ay, az, bx, by, bz) {
  const ma = mag(ax, ay, az), mb = mag(bx, by, bz)
  if (ma === 0 || mb === 0) return 0
  const c = Math.max(-1, Math.min(1, dot(ax, ay, az, bx, by, bz) / (ma*mb)))
  return Math.acos(c) * 180 / Math.PI
}

export default function useRepCounter(opts) {
  const {
    mode = "deltaAngle",                              // "deltaAngle" | "axis"
    target = 10,
    updateMs = 60,
    emaAlpha = 0.2,
    baselineAlpha = 0.01,                             // axis 모드에서만 사용
    calibrateMs = 2000,                               // deltaAngle 모드에서만 사용
    axis = "y",                                       // axis 모드에서 사용할 축
    thresholds = { up: 25, top: 55, down: 12 },       // deltaAngle 기본값
    axisThresholds = { downDelta: 0.35, upDelta: 0.20 }, // axis 기본값
    minRepMs = 1200,
    holdMs = 220,
    minRangeDelta = 40,                               // deltaAngle 전용: 1회 가동범위
    maxJerkG = 1.2,
  } = opts || {}

  const [reps, setReps] = useState(0)
  const [phase, setPhase] = useState("idle")
  const [calibrated, setCalibrated] = useState(mode === "axis")
  const [value, setValue] = useState(0)               // 화면 디버깅용(각도/축값)

  const emaRef = useRef({ x: 0, y: 0, z: 0 })
  const baseRef = useRef({ x: 0, y: 0, z: 0 })
  const baselineAxisRef = useRef(0)                   // axis 모드 기준선
  const lastMagRef = useRef(0)
  const repStartTsRef = useRef(0)
  const topTsRef = useRef(0)
  const repMinRef = useRef(0)
  const repMaxRef = useRef(0)
  const calStartRef = useRef(0)
  const firstRef = useRef(true)

  useEffect(() => {
    Accelerometer.setUpdateInterval(updateMs)
    let sub = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now()

      const m = mag(x, y, z)
      const jerk = Math.abs(m - (lastMagRef.current || m))
      lastMagRef.current = m
      if (jerk > maxJerkG) return

      if (firstRef.current) {
        emaRef.current = { x, y, z }
        if (mode === "deltaAngle") {
          calStartRef.current = now
          setPhase("calibrating")
        } else {
          baselineAxisRef.current = axis === "x" ? x : axis === "y" ? y : z
          setPhase("idle")
        }
        repStartTsRef.current = now
        repMinRef.current = 0
        repMaxRef.current = 0
        firstRef.current = false
        return
      }

      const ex = emaRef.current.x + emaAlpha * (x - emaRef.current.x)
      const ey = emaRef.current.y + emaAlpha * (y - emaRef.current.y)
      const ez = emaRef.current.z + emaAlpha * (z - emaRef.current.z)
      emaRef.current = { x: ex, y: ey, z: ez }

      if (mode === "deltaAngle") {
        if (!calibrated) {
          if (now - (calStartRef.current || now) >= calibrateMs) {
            baseRef.current = { ...emaRef.current }
            setCalibrated(true)
            setPhase("idle")
            repStartTsRef.current = now
          } else {
            return
          }
        }
        const ang = angleBetween(ex, ey, ez, baseRef.current.x, baseRef.current.y, baseRef.current.z)
        setValue(ang)

        if (phase === "idle") {
          repMinRef.current = ang; repMaxRef.current = ang
          if (ang > thresholds.up) { setPhase("goingUp"); repStartTsRef.current = now }
        } else if (phase === "goingUp") {
          repMinRef.current = Math.min(repMinRef.current, ang)
          repMaxRef.current = Math.max(repMaxRef.current, ang)
          if (ang > thresholds.top) { setPhase("top"); topTsRef.current = now }
          if (ang < thresholds.down) { setPhase("idle"); repStartTsRef.current = now }
        } else if (phase === "top") {
          if ((now - topTsRef.current) >= holdMs && ang < thresholds.up) setPhase("goingDown")
        } else if (phase === "goingDown") {
          repMinRef.current = Math.min(repMinRef.current, ang)
          repMaxRef.current = Math.max(repMaxRef.current, ang)
          if (ang < thresholds.down) {
            const repMs = now - repStartTsRef.current
            const range = repMaxRef.current - repMinRef.current
            if (repMs >= minRepMs && range >= minRangeDelta) {
              setReps(r => r + 1)
            }
            setPhase("idle")
            repStartTsRef.current = now
            repMinRef.current = 0; repMaxRef.current = 0
          }
          if (ang > thresholds.up) setPhase("goingUp")
        }
      } else {
        // axis 모드
        const curAxis = axis === "x" ? ex : axis === "y" ? ey : ez
        setValue(curAxis)
        if (phase === "idle" || phase === "goingUp") {
          baselineAxisRef.current = baselineAxisRef.current + baselineAlpha * (curAxis - baselineAxisRef.current)
        }
        const base = baselineAxisRef.current
        const d = curAxis - base

        if (phase === "idle") {
          if (d < -axisThresholds.downDelta * 0.5) { setPhase("goingDown"); repStartTsRef.current = now }
        } else if (phase === "goingDown") {
          if (d < -axisThresholds.downDelta) { setPhase("bottom"); topTsRef.current = now }
          if (now - repStartTsRef.current < 250 && d > 0) { setPhase("idle") }
        } else if (phase === "bottom") {
          if ((now - topTsRef.current) >= holdMs && d > -axisThresholds.upDelta) setPhase("goingUp")
        } else if (phase === "goingUp") {
          if (d > axisThresholds.upDelta * 0.6) {
            const repMs = now - repStartTsRef.current
            if (repMs >= minRepMs) setReps(r => r + 1)
            setPhase("idle"); repStartTsRef.current = now
          }
          if (d < -axisThresholds.downDelta) { setPhase("goingDown"); repStartTsRef.current = now }
        }
      }
    })

    return () => { sub && sub.remove() }
  }, [mode, target, updateMs, emaAlpha, baselineAlpha, calibrateMs, axis, thresholds, axisThresholds, minRepMs, holdMs, minRangeDelta, maxJerkG, phase, calibrated])

  return { reps, phase, calibrated, value, setReps, setPhase }
}
