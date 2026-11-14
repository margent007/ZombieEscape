import { KeyBindings } from '../types/game';

export const DEFAULT_KEYBINDINGS: KeyBindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  sprint: 'ShiftLeft',
  sneak: 'ControlLeft',
  interact: 'KeyE',
  attack: 'Space', // Also Left Click
  reload: 'KeyR',
  flashlight: 'KeyF',
  crafting: 'KeyC',
  minimap: 'KeyM',
  quickUse: 'KeyX',
  quickBackpack: 'Tab',
  sonarPing: 'KeyQ',
  pause: 'Escape',
};

export class InputManager {
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private bindings: KeyBindings = { ...DEFAULT_KEYBINDINGS };

  // Mouse aim & clicks
  public mouseX: number = 0;
  public mouseY: number = 0;
  public isMouseDown: boolean = false;
  public isMouseJustPressed: boolean = false;

  // Gamepad state
  public gamepadConnected: boolean = false;
  public gamepadId: string = '';
  private lastGamepadButtons: boolean[] = [];

  // Mobile Touch Controls state
  private touchDx: number = 0;
  private touchDy: number = 0;
  private touchSprint: boolean = false;
  private touchAimAngle: number | null = null;
  private touchHeld = new Set<'attack' | 'interact'>();
  private touchJustPressed = new Set<
    'attack' | 'interact' | 'reload' | 'flashlight' | 'sonarPing' | 'quickUse' | 'crafting' | 'minimap' | 'pause'
  >();

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleGamepadConnect = this.handleGamepadConnect.bind(this);
    this.handleGamepadDisconnect = this.handleGamepadDisconnect.bind(this);
  }

  public init() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('gamepadconnected', this.handleGamepadConnect);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnect);
  }

  public cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnect);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnect);
  }

  public setBindings(newBindings: KeyBindings) {
    this.bindings = { ...newBindings };
  }

  public getBindings(): KeyBindings {
    return { ...this.bindings };
  }

  private handleKeyDown(e: KeyboardEvent) {
    // If typing in input, ignore
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

    if (!this.heldKeys.has(e.code)) {
      this.justPressedKeys.add(e.code);
    }
    this.heldKeys.add(e.code);

    // Prevent scrolling and focus jumping for game controls
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.heldKeys.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.isMouseJustPressed = true;
    }
  }

  private handleMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  }

  private handleBlur() {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.isMouseDown = false;
  }

  private handleGamepadConnect(e: GamepadEvent) {
    this.gamepadConnected = true;
    this.gamepadId = e.gamepad.id;
  }

  private handleGamepadDisconnect() {
    this.gamepadConnected = false;
    this.gamepadId = '';
  }

  public setTouchMove(dx: number, dy: number, sprint: boolean = false) {
    this.touchDx = dx;
    this.touchDy = dy;
    this.touchSprint = sprint;
  }

  public setTouchAim(angle: number | null) {
    this.touchAimAngle = angle;
  }

  public setTouchHold(action: 'attack' | 'interact', held: boolean) {
    if (held) {
      if (!this.touchHeld.has(action)) {
        this.touchJustPressed.add(action);
      }
      this.touchHeld.add(action);
    } else {
      this.touchHeld.delete(action);
    }
  }

  public triggerTouchAction(
    action: 'attack' | 'interact' | 'reload' | 'flashlight' | 'sonarPing' | 'quickUse' | 'crafting' | 'minimap' | 'pause'
  ) {
    this.touchJustPressed.add(action);
  }

  public resetTouch() {
    this.touchDx = 0;
    this.touchDy = 0;
    this.touchSprint = false;
    this.touchAimAngle = null;
    this.touchHeld.clear();
    this.touchJustPressed.clear();
  }

  /**
   * Called once at the end of each game frame to consume edge triggers
   */
  public endFrame() {
    this.justPressedKeys.clear();
    this.touchJustPressed.clear();
    this.isMouseJustPressed = false;
  }

  /**
   * Polls input vector and action states combining Keyboard, Mouse, Touch, and Gamepad
   */
  public getInputs(): {
    dx: number;
    dy: number;
    sprint: boolean;
    sneak: boolean;
    interact: boolean;
    interactHeld: boolean;
    attack: boolean;
    attackHeld: boolean;
    reload: boolean;
    flashlight: boolean;
    crafting: boolean;
    minimap: boolean;
    quickUse: boolean;
    quickBackpack: boolean;
    sonarPing: boolean;
    pause: boolean;
    gamepadAimAngle: number | null;
    touchAimAngle: number | null;
  } {
    let dx = 0;
    let dy = 0;

    // Keyboard movement (primary or arrow fallback)
    if (this.heldKeys.has(this.bindings.moveUp) || this.heldKeys.has('ArrowUp')) dy -= 1;
    if (this.heldKeys.has(this.bindings.moveDown) || this.heldKeys.has('ArrowDown')) dy += 1;
    if (this.heldKeys.has(this.bindings.moveLeft) || this.heldKeys.has('ArrowLeft')) dx -= 1;
    if (this.heldKeys.has(this.bindings.moveRight) || this.heldKeys.has('ArrowRight')) dx += 1;

    let sprint = this.heldKeys.has(this.bindings.sprint);
    let sneak = this.heldKeys.has(this.bindings.sneak);

    let interact = this.justPressedKeys.has(this.bindings.interact) || this.justPressedKeys.has('KeyE');
    let interactHeld = this.heldKeys.has(this.bindings.interact) || this.heldKeys.has('KeyE');
    let attack = this.justPressedKeys.has(this.bindings.attack) || this.isMouseJustPressed;
    let attackHeld = this.heldKeys.has(this.bindings.attack) || this.isMouseDown;
    let reload = this.justPressedKeys.has(this.bindings.reload) || this.justPressedKeys.has('KeyR');
    let flashlight = this.justPressedKeys.has(this.bindings.flashlight) || this.justPressedKeys.has('KeyF');
    let crafting = this.justPressedKeys.has(this.bindings.crafting) || this.justPressedKeys.has('KeyC');
    let minimap = this.justPressedKeys.has(this.bindings.minimap) || this.justPressedKeys.has('KeyM');
    let quickUse = this.justPressedKeys.has(this.bindings.quickUse || 'KeyX') || this.justPressedKeys.has('KeyX');
    let quickBackpack = this.justPressedKeys.has(this.bindings.quickBackpack || 'Tab') || this.justPressedKeys.has('Tab');
    let sonarPing = this.justPressedKeys.has(this.bindings.sonarPing || 'KeyQ') || this.justPressedKeys.has('KeyQ');
    let pause = this.justPressedKeys.has(this.bindings.pause) || this.justPressedKeys.has('KeyP') || this.justPressedKeys.has('Escape');

    let gamepadAimAngle: number | null = null;

    // Check Gamepad
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      const gp = gamepads ? gamepads[0] : null;
      if (gp) {
        this.gamepadConnected = true;
        this.gamepadId = gp.id;

        // Left Stick (Movement) with deadzone
        const deadzone = 0.22;
        const lx = gp.axes[0] || 0;
        const ly = gp.axes[1] || 0;
        if (Math.abs(lx) > deadzone || Math.abs(ly) > deadzone) {
          dx = lx;
          dy = ly;
        }

        // D-Pad buttons
        if (gp.buttons[12]?.pressed) dy = -1;
        if (gp.buttons[13]?.pressed) dy = 1;
        if (gp.buttons[14]?.pressed) dx = -1;
        if (gp.buttons[15]?.pressed) dx = 1;

        // Right Stick (Aiming direction)
        const rx = gp.axes[2] || 0;
        const ry = gp.axes[3] || 0;
        if (Math.hypot(rx, ry) > 0.3) {
          gamepadAimAngle = Math.atan2(ry, rx);
        }

        // Helper for gamepad edge trigger
        const isBtnJustDown = (btnIdx: number) => {
          const pressed = !!gp.buttons[btnIdx]?.pressed;
          const wasPressed = !!this.lastGamepadButtons[btnIdx];
          return pressed && !wasPressed;
        };

        // Button mappings:
        // A / Cross (Btn 0) -> Interact
        if (isBtnJustDown(0)) interact = true;
        if (gp.buttons[0]?.pressed) interactHeld = true;

        // RT (Btn 7) or RB (Btn 5) -> Attack
        const rtPressed = !!gp.buttons[7]?.pressed || !!gp.buttons[5]?.pressed;
        if (isBtnJustDown(7) || isBtnJustDown(5)) attack = true;
        if (rtPressed) attackHeld = true;

        // LT (Btn 6) -> Sprint
        if (gp.buttons[6]?.pressed) sprint = true;

        // LB (Btn 4) -> Sonar Radar Ping
        if (isBtnJustDown(4)) sonarPing = true;

        // B / Circle (Btn 1) -> Flashlight
        if (isBtnJustDown(1)) flashlight = true;

        // X / Square (Btn 2) -> Reload
        if (isBtnJustDown(2)) reload = true;

        // Y / Triangle (Btn 3) -> Crafting
        if (isBtnJustDown(3)) crafting = true;

        // R3 / Right Stick Click (Btn 11) -> Quick Use (Adrenaline / Medkit)
        if (isBtnJustDown(11)) quickUse = true;

        // L3 / Left Stick Click (Btn 10) -> Sneak toggle
        if (isBtnJustDown(10)) sneak = !sneak;

        // Select / View / Back (Btn 8) -> Minimap toggle
        if (isBtnJustDown(8)) minimap = true;

        // Start / Menu (Btn 9) -> Pause
        if (isBtnJustDown(9)) pause = true;

        // Record gamepad button history
        this.lastGamepadButtons = gp.buttons.map(b => b.pressed);
      }
    }

    // Merge Mobile Touch Inputs
    if (this.touchDx !== 0 || this.touchDy !== 0) {
      dx = this.touchDx;
      dy = this.touchDy;
    }
    if (this.touchSprint) sprint = true;
    if (this.touchJustPressed.has('interact')) interact = true;
    if (this.touchHeld.has('interact')) interactHeld = true;
    if (this.touchJustPressed.has('attack')) attack = true;
    if (this.touchHeld.has('attack')) attackHeld = true;
    if (this.touchJustPressed.has('reload')) reload = true;
    if (this.touchJustPressed.has('flashlight')) flashlight = true;
    if (this.touchJustPressed.has('crafting')) crafting = true;
    if (this.touchJustPressed.has('minimap')) minimap = true;
    if (this.touchJustPressed.has('quickUse')) quickUse = true;
    if (this.touchJustPressed.has('sonarPing')) sonarPing = true;
    if (this.touchJustPressed.has('pause')) pause = true;

    // Normalize diagonal movement vector
    if (dx !== 0 && dy !== 0) {
      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }
    }

    return {
      dx,
      dy,
      sprint,
      sneak,
      interact,
      interactHeld,
      attack,
      attackHeld,
      reload,
      flashlight,
      crafting,
      minimap,
      quickUse,
      quickBackpack,
      sonarPing,
      pause,
      gamepadAimAngle,
      touchAimAngle: this.touchAimAngle,
    };
  }

  /**
   * Triggers haptic vibration on gamepad if supported
   */
  public triggerHaptics(durationMs: number = 100, intensity: number = 0.6) {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads ? gamepads[0] : null;
    if (gp && (gp as any).vibrationActuator) {
      try {
        (gp as any).vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: intensity,
          strongMagnitude: intensity * 0.8,
        });
      } catch {
        // unsupported or permissions
      }
    }
  }
}

export const inputManager = new InputManager();
