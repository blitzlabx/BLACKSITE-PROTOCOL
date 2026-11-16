export function detectTouchEnvironment() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') === '1') return true;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return Boolean((coarse || hasTouch) && window.innerWidth <= 1024);
  } catch {
    return false;
  }
}

export class InputHub {
  constructor() {
    this.held = new Set();
    this.justPressed = new Set();
    this.mouseDownLeft = false;
    this.mouseJustPressedLeft = false;
    this.mouseRight = false;
    this.lookDx = 0;
    this.lookDy = 0;
    this.isDragging = false;

    this.isTouchMode = detectTouchEnvironment();
    this.moveX = 0;
    this.moveY = 0;
    this.touchFire = false;
    this.touchJustPressedFire = false;
    this.touchAds = false;
    this.touchInteract = false;
    this._lookTouchId = null;
    this._lookLastX = 0;
    this._lookLastY = 0;

    this._onKeyDown = (e) => {
      if (!this.held.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.held.add(e.code);
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (document.body.dataset.state === 'playing') {
          e.preventDefault();
        }
      }
    };

    this._onKeyUp = (e) => {
      this.held.delete(e.code);
    };

    this._onBlur = () => {
      this.clear();
    };

    this._onVisibility = () => {
      if (document.hidden) this.clear();
    };

    this._onResize = () => {
      this.isTouchMode = detectTouchEnvironment();
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  bindCanvas(canvas, onInteractUnlock) {
    canvas.addEventListener('mousedown', (e) => {
      if (this.isTouchMode) return;
      if (onInteractUnlock) onInteractUnlock();
      if (e.button === 0) {
        this.mouseDownLeft = true;
        this.mouseJustPressedLeft = true;
        this.isDragging = true;
      } else if (e.button === 2) {
        this.mouseRight = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isTouchMode) return;
      if (e.button === 0) {
        this.mouseDownLeft = false;
        this.isDragging = false;
      } else if (e.button === 2) {
        this.mouseRight = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        const rx = e.movementX || 0;
        const ry = e.movementY || 0;
        if (Math.abs(rx) > 120 || Math.abs(ry) > 120) return;
        this.lookDx += Math.max(-60, Math.min(60, rx));
        this.lookDy += Math.max(-60, Math.min(60, ry));
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      this.isTouchMode = true;
      if (onInteractUnlock) onInteractUnlock();
      if (this._lookTouchId !== null) return;
      for (const touch of e.changedTouches) {
        this._lookTouchId = touch.identifier;
        this._lookLastX = touch.clientX;
        this._lookLastY = touch.clientY;
        break;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (this._lookTouchId === null) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._lookTouchId) {
          const dx = touch.clientX - this._lookLastX;
          const dy = touch.clientY - this._lookLastY;
          this._lookLastX = touch.clientX;
          this._lookLastY = touch.clientY;
          this.lookDx += Math.max(-60, Math.min(60, dx * 1.65));
          this.lookDy += Math.max(-60, Math.min(60, dy * 1.65));
          break;
        }
      }
    }, { passive: true });

    const endTouchLook = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._lookTouchId) {
          this._lookTouchId = null;
          break;
        }
      }
    };
    canvas.addEventListener('touchend', endTouchLook, { passive: true });
    canvas.addEventListener('touchcancel', endTouchLook, { passive: true });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setVirtualMove(nx, ny) {
    this.moveX = Math.max(-1, Math.min(1, nx));
    this.moveY = Math.max(-1, Math.min(1, ny));
  }

  setTouchFire(down) {
    if (down && !this.touchFire) {
      this.touchJustPressedFire = true;
    }
    this.touchFire = down;
  }

  toggleTouchAds() {
    this.touchAds = !this.touchAds;
    return this.touchAds;
  }

  setTouchInteract(down) {
    this.touchInteract = down;
  }

  triggerVirtualKey(code) {
    this.justPressed.add(code);
  }

  consumeJustPressed(code) {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  consumeLookDelta() {
    const dx = this.lookDx;
    const dy = this.lookDy;
    this.lookDx = 0;
    this.lookDy = 0;
    return { dx, dy };
  }

  endFrame() {
    this.justPressed.clear();
    this.mouseJustPressedLeft = false;
    this.touchJustPressedFire = false;
  }

  clear() {
    this.held.clear();
    this.justPressed.clear();
    this.mouseDownLeft = false;
    this.mouseJustPressedLeft = false;
    this.mouseRight = false;
    this.isDragging = false;
    this.moveX = 0;
    this.moveY = 0;
    this.touchFire = false;
    this.touchJustPressedFire = false;
    this.touchAds = false;
    this.touchInteract = false;
    this._lookTouchId = null;
    this.lookDx = 0;
    this.lookDy = 0;
  }
}

export class GameEngine {
  constructor(rendererWrap, onUpdate, onRender) {
    this.rendererWrap = rendererWrap;
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.running = false;
    this.frameId = 0;
    this.lastTime = performance.now();
    this.elapsed = 0;
    this.hitstopTimer = 0;
  }

  triggerHitstop(seconds = 0.045) {
    this.hitstopTimer = Math.max(this.hitstopTimer, seconds);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._scheduleNext();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  }

  _scheduleNext() {
    if (!this.running) return;
    if (this.rendererWrap.isSoftwareGl) {
      this._afterDraw(() => this._tick());
    } else {
      this.frameId = requestAnimationFrame(() => this._tick());
    }
  }

  _afterDraw(cb) {
    const gl = this.rendererWrap.renderer.getContext();
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.running) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  _tick() {
    if (!this.running) return;
    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const totalDt = this.rendererWrap.isSoftwareGl ? Math.min(rawDt, 0.16) : Math.min(rawDt, 0.05);
    const steps = Math.max(1, Math.ceil(totalDt / 0.05));
    const stepDt = totalDt / steps;

    for (let s = 0; s < steps; s++) {
      this.elapsed += stepDt;
      let simDt = stepDt;
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - stepDt);
        simDt = 0;
      }
      this.onUpdate(stepDt, simDt, this.elapsed);
    }

    this.onRender();
    this._scheduleNext();
  }
}
