"use client";

import { useEffect, useRef } from "react";
import styles from "./start-cursor.module.css";

/** A quiet, decorative pointer companion. Mount only on the welcome page. */
export function StartCursor() {
  const layerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!layer || !ring || !dot) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let enabled = false;
    let visible = false;
    let frame = 0;
    let previousTime = 0;
    let targetX = 0;
    let targetY = 0;
    let ringX = 0;
    let ringY = 0;
    let dotX = 0;
    let dotY = 0;

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };

    const hide = () => {
      visible = false;
      layer.dataset.visible = "false";
      stop();
    };

    const paint = () => {
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
    };

    const animate = (time: number) => {
      frame = 0;
      if (!enabled || !visible) return;
      const elapsed = previousTime ? Math.min(time - previousTime, 32) : 16;
      previousTime = time;
      // Frame-rate independent easing keeps the wake soft on all displays.
      const ringEase = 1 - Math.exp(-elapsed / 75);
      const dotEase = 1 - Math.exp(-elapsed / 38);
      ringX += (targetX - ringX) * ringEase;
      ringY += (targetY - ringY) * ringEase;
      dotX += (targetX - dotX) * dotEase;
      dotY += (targetY - dotY) * dotEase;
      paint();
      if (Math.abs(targetX - ringX) + Math.abs(targetY - ringY) > 0.2) {
        frame = window.requestAnimationFrame(animate);
      } else {
        ringX = dotX = targetX;
        ringY = dotY = targetY;
        paint();
        previousTime = 0;
      }
    };

    const move = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return;
      targetX = event.clientX + 16;
      targetY = event.clientY + 18;
      if (!visible) {
        ringX = dotX = targetX;
        ringY = dotY = targetY;
        paint();
        visible = true;
        layer.dataset.visible = "true";
      }
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };

    const refreshPreference = () => {
      enabled = finePointer.matches && !reducedMotion.matches;
      layer.dataset.enabled = String(enabled);
      if (!enabled) hide();
    };

    const visibilityChange = () => {
      if (document.hidden) hide();
    };

    refreshPreference();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leave, { passive: true });
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", visibilityChange);
    finePointer.addEventListener("change", refreshPreference);
    reducedMotion.addEventListener("change", refreshPreference);

    return () => {
      stop();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", visibilityChange);
      finePointer.removeEventListener("change", refreshPreference);
      reducedMotion.removeEventListener("change", refreshPreference);
    };
  }, []);

  return <div
    ref={layerRef}
    className={styles.layer}
    aria-hidden="true"
    data-start-cursor=""
    data-enabled="false"
    data-visible="false"
  >
    <span ref={ringRef} className={styles.ring} />
    <span ref={dotRef} className={styles.dot} />
  </div>;
}
