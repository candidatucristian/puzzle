import Phaser from "phaser";
import { seededRandom, sketchSegment, drawPath, roundRectPoints } from "../shared/sketch.js";
import { drawVignette } from "../shared/vignette.js";
import { attachSceneFeedback } from '../shared/interaction.js';

/** Scene-local resources are released exactly once, including on replay. */
export default class BasePuzzleScene extends Phaser.Scene {
  get services() {
    return this.game.services;
  }

  beginScene() {
    this._sceneCleanups = new Set();
    this._sceneTimeouts = new Set();
    this._sceneOpen = true;
    this._ambientTweens = new Set();
    this._ambientObjects = new Set();
    this.events.once("shutdown", this._releaseScene, this);
    this.services.audio.enterScene(this);
    this._sceneCleanups.add(attachSceneFeedback(this));
    if (this.services.preferences) {
      this._sceneCleanups.add(this.services.preferences.subscribe(() => {
        for (const tween of this._ambientTweens) {
          if (tween.isDestroyed()) { this._ambientTweens.delete(tween); continue; }
          if (this.ambientMotion) tween.resume(); else tween.pause();
        }
        for (const object of this._ambientObjects) {
          if (!object.scene) { this._ambientObjects.delete(object); continue; }
          object.setVisible(this.ambientMotion);
        }
      }));
    }
  }

  get reducedMotion() { return this.services.preferences?.reducedMotion || false; }
  get ambientMotion() { return this.services.preferences?.ambientMotion ?? true; }
  get ambientEffects() { return this.services.preferences?.state.ambientEffects ?? true; }

  ambientTween(config) {
    for (const old of this._ambientTweens) if (old.isDestroyed()) this._ambientTweens.delete(old);
    const tween = this.tweens.add({ ...config, paused: !this.ambientMotion });
    this._ambientTweens.add(tween);
    const release = () => this._ambientTweens.delete(tween);
    tween.once('complete', release); tween.once('stop', release);
    return tween;
  }

  ambientObject(object) {
    for (const old of this._ambientObjects) if (!old.scene) this._ambientObjects.delete(old);
    this._ambientObjects.add(object);
    return object.setVisible(this.ambientMotion);
  }

  listenToResize(callback) {
    this.events.on("canvas_resized", callback);
    this._sceneCleanups.add(() => this.events.off("canvas_resized", callback));
    return callback;
  }

  ownDom(element) {
    this._sceneCleanups.add(() => element.remove());
    return element;
  }

  setSceneTimeout(callback, delay) {
    const timer = setTimeout(() => {
      this._sceneTimeouts.delete(timer);
      if (this._sceneOpen) callback();
    }, delay);
    this._sceneTimeouts.add(timer);
    return timer;
  }

  clearSceneTimeout(timer) {
    clearTimeout(timer);
    this._sceneTimeouts?.delete(timer);
  }

  _releaseScene() {
    if (!this._sceneOpen) return;
    this._sceneOpen = false;
    try {
      this.shutdown?.();
    } finally {
      for (const timer of this._sceneTimeouts) clearTimeout(timer);
      this._sceneTimeouts.clear();
      for (const cleanup of this._sceneCleanups) cleanup();
      this._sceneCleanups.clear();
      this.services.audio.leaveScene(this);
    }
  }

  _rng(seed) { return seededRandom(seed); }
  _sketchSeg(...args) { return sketchSegment(...args); }
  _drawPath(...args) { return drawPath(...args); }
  _roundRectPts(...args) { return roundRectPoints(...args); }
  _drawVignette(width, height) { drawVignette(this, width, height); }

  // Dispatch through the scene so deliberate local pencil variants still apply.
  _pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, mag = 2) {
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, mag), width, color, alpha);
    this._drawPath(
      g, this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6, color, alpha * 0.35,
    );
  }

  _pencilRect(g, rnd, x, y, w, h, width, color, alpha, mag = 2) {
    const o = 4;
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 18, mag = 1.6) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * mag;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }
}
