import { BrowserWindow, Menu, screen } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../utils/logger';
import { getSetting, setSetting } from '../utils/store';
import { SPRITE_OVERLAY_WINDOW_TITLE } from './branding';
import type {
  SpriteOverlayBounds,
  SpriteOverlaySettings,
  SpriteStatePayload,
} from '../../shared/sprite';
import { supportsSpriteOverlayPlatform } from '../../shared/sprite';

const DEFAULT_BOUNDS = {
  width: 240,
  height: 240,
};
const isE2EMode = process.env.CLAWX_E2E === '1';
const MAX_OVERLAY_DIMENSION = 300;
const DRAG_THRESHOLD = 4;
const DRAG_POLL_INTERVAL_MS = 16;

function resolveDefaultBounds(): SpriteOverlayBounds {
  const workArea = screen.getPrimaryDisplay().workArea;
  return {
    width: DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height,
    x: Math.max(workArea.x, workArea.x + workArea.width - DEFAULT_BOUNDS.width - 24),
    y: Math.max(workArea.y, workArea.y + workArea.height - DEFAULT_BOUNDS.height - 40),
  };
}

export class SpriteOverlayManager {
  private overlayWindow: BrowserWindow | null = null;
  private lastPayload: SpriteStatePayload | null = null;
  private initialAutoShowHandled = false;
  private interactionLocked = false;

  /** Drag state */
  private dragStartScreenX = 0;
  private dragStartScreenY = 0;
  private dragStartWinX = 0;
  private dragStartWinY = 0;
  private dragPollTimer: ReturnType<typeof setInterval> | null = null;
  private dragMoved = false;

  constructor(private readonly getMainWindow: () => BrowserWindow | null) {}

  isSupported(): boolean {
    return supportsSpriteOverlayPlatform(process.platform);
  }

  private async resolveBounds(): Promise<SpriteOverlayBounds> {
    const saved = await getSetting('spriteOverlayBounds').catch(() => null);
    if (saved && typeof saved === 'object') {
      const parsed = saved as SpriteOverlayBounds;
      if (parsed.width <= MAX_OVERLAY_DIMENSION && parsed.height <= MAX_OVERLAY_DIMENSION) {
        return parsed;
      }
    }
    return resolveDefaultBounds();
  }

  private async persistBounds(): Promise<void> {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    const { x, y, width, height } = this.overlayWindow.getBounds();
    await setSetting('spriteOverlayBounds', { x, y, width, height });
  }

  private async resolveLocked(): Promise<boolean> {
    return await getSetting('spriteOverlayLocked').catch(() => false);
  }

  private async applyInteractionLock(locked: boolean, persist = true): Promise<void> {
    this.interactionLocked = locked;

    if (locked) {
      this.stopDragPolling();
      this.dragMoved = false;
    }

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.setIgnoreMouseEvents(locked);
    }

    if (persist) {
      await setSetting('spriteOverlayLocked', locked);
    }
  }

  private buildContextMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: 'Lock',
        click: () => {
          void this.setLocked(true).catch((error) => {
            logger.warn('Failed to lock sprite overlay:', error);
          });
        },
      },
      {
        label: 'Close',
        click: () => {
          void this.closeFromMenu().catch((error) => {
            logger.warn('Failed to close sprite overlay from context menu:', error);
          });
        },
      },
    ]);
  }

  private async loadWindow(win: BrowserWindow): Promise<void> {
    if (process.env.VITE_DEV_SERVER_URL) {
      const rendererUrl = new URL(process.env.VITE_DEV_SERVER_URL);
      rendererUrl.hash = '/sprite-overlay';
      await win.loadURL(rendererUrl.toString());
      return;
    }

    const fileUrl = pathToFileURL(join(__dirname, '../../dist/index.html'));
    fileUrl.hash = '/sprite-overlay';
    await win.loadURL(fileUrl.toString());
  }

  private async createWindow(): Promise<BrowserWindow> {
    const bounds = await this.resolveBounds();
    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth: 240,
      minHeight: 240,
      maxWidth: 240,
      maxHeight: 240,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      roundedCorners: false,
      title: SPRITE_OVERLAY_WINDOW_TITLE,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    win.on('move', () => {
      void this.persistBounds().catch((error) => {
        logger.warn('Failed to persist sprite overlay bounds after move:', error);
      });
    });

    win.on('resize', () => {
      void this.persistBounds().catch((error) => {
        logger.warn('Failed to persist sprite overlay bounds after resize:', error);
      });
    });

    win.on('closed', () => {
      this.stopDragPolling();
      this.overlayWindow = null;
    });

    win.webContents.on('context-menu', (event) => {
      if (this.interactionLocked) {
        return;
      }
      event.preventDefault();
      this.buildContextMenu().popup({ window: win });
    });

    win.webContents.on('did-finish-load', () => {
      if (this.lastPayload) {
        win.webContents.send('sprite:overlay-state', this.lastPayload);
      }
    });

    this.overlayWindow = win;
    await this.loadWindow(win);
    await this.applyInteractionLock(await this.resolveLocked(), false);
    return win;
  }

  private async ensureWindow(): Promise<BrowserWindow | null> {
    if (!this.isSupported()) return null;
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      return this.overlayWindow;
    }
    return await this.createWindow();
  }

  async syncState(payload: SpriteStatePayload): Promise<void> {
    this.lastPayload = payload;
    if (!this.isSupported()) return;

    const enabled = await getSetting('spriteOverlayEnabled').catch(() => true);
    if (!this.initialAutoShowHandled) {
      this.initialAutoShowHandled = true;
      if (enabled && !isE2EMode) {
        await this.show();
      }
    }

    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send('sprite:overlay-state', payload);
    }
  }

  async show(): Promise<void> {
    const win = await this.ensureWindow();
    if (!win) return;
    if (this.lastPayload) {
      win.webContents.send('sprite:overlay-state', this.lastPayload);
    }
    win.show();
  }

  async hide(): Promise<void> {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    this.overlayWindow.hide();
  }

  async toggle(): Promise<void> {
    if (
      !this.overlayWindow ||
      this.overlayWindow.isDestroyed() ||
      !this.overlayWindow.isVisible()
    ) {
      await this.show();
      return;
    }
    await this.hide();
  }

  async applyPreference(enabled: boolean): Promise<void> {
    this.initialAutoShowHandled = true;
    if (!enabled) {
      await this.hide();
      return;
    }
    await this.show();
  }

  async setLocked(locked: boolean): Promise<void> {
    await this.applyInteractionLock(Boolean(locked));
  }

  async closeFromMenu(): Promise<void> {
    await setSetting('spriteOverlayEnabled', false);
    await this.applyPreference(false);
  }

  async getState(): Promise<SpriteOverlaySettings> {
    const bounds = await getSetting('spriteOverlayBounds').catch(() => null);
    const enabled = await getSetting('spriteOverlayEnabled').catch(() => true);
    const locked = await getSetting('spriteOverlayLocked').catch(() => this.interactionLocked);
    return {
      enabled,
      locked,
      supported: this.isSupported(),
      visible: Boolean(
        this.overlayWindow && !this.overlayWindow.isDestroyed() && this.overlayWindow.isVisible()
      ),
      bounds,
    };
  }

  // ── Drag logic (main-process side) ──────────────────────────

  startDrag(screenX: number, screenY: number): void {
    if (this.interactionLocked) return;
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;

    this.dragStartScreenX = screenX;
    this.dragStartScreenY = screenY;
    const [wx, wy] = this.overlayWindow.getPosition();
    this.dragStartWinX = wx;
    this.dragStartWinY = wy;
    this.dragMoved = false;

    this.stopDragPolling();
    this.dragPollTimer = setInterval(() => this.dragTick(), DRAG_POLL_INTERVAL_MS);
  }

  private dragTick(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.stopDragPolling();
      return;
    }

    const point = screen.getCursorScreenPoint();
    const dx = point.x - this.dragStartScreenX;
    const dy = point.y - this.dragStartScreenY;

    if (!this.dragMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) {
      return;
    }

    this.dragMoved = true;
    this.overlayWindow.setPosition(
      this.dragStartWinX + dx,
      this.dragStartWinY + dy,
      false,
    );
  }

  endDrag(): void {
    if (this.interactionLocked) return;
    this.stopDragPolling();
    if (!this.dragMoved) {
      // No significant movement → treat as click
      this.focusMainWindow();
    }
  }

  private stopDragPolling(): void {
    if (this.dragPollTimer !== null) {
      clearInterval(this.dragPollTimer);
      this.dragPollTimer = null;
    }
  }

  focusMainWindow(): void {
    const mainWindow = this.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }

  destroy(): void {
    this.stopDragPolling();
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    this.overlayWindow.destroy();
    this.overlayWindow = null;
  }
}
