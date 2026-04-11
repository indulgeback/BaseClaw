import { BrowserWindow, app, screen } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../utils/logger';
import { getSetting, setSetting } from '../utils/store';
import type { SpriteOverlayBounds, SpriteOverlaySettings, SpriteStatePayload } from '../../shared/sprite';
import { supportsSpriteOverlayPlatform } from '../../shared/sprite';

const DEFAULT_BOUNDS = {
  width: 280,
  height: 320,
};
const isE2EMode = process.env.CLAWX_E2E === '1';

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

  constructor(private readonly getMainWindow: () => BrowserWindow | null) {}

  isSupported(): boolean {
    return supportsSpriteOverlayPlatform(process.platform);
  }

  private async resolveBounds(): Promise<SpriteOverlayBounds> {
    const saved = await getSetting('spriteOverlayBounds').catch(() => null);
    if (saved && typeof saved === 'object') {
      return saved as SpriteOverlayBounds;
    }
    return resolveDefaultBounds();
  }

  private async persistBounds(): Promise<void> {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    const { x, y, width, height } = this.overlayWindow.getBounds();
    await setSetting('spriteOverlayBounds', { x, y, width, height });
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
      minWidth: 220,
      minHeight: 260,
      maxWidth: 420,
      maxHeight: 480,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      roundedCorners: false,
      title: 'SpriteClaw Sprite',
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
      this.overlayWindow = null;
    });

    win.webContents.on('did-finish-load', () => {
      if (this.lastPayload) {
        win.webContents.send('sprite:overlay-state', this.lastPayload);
      }
    });

    await this.loadWindow(win);
    this.overlayWindow = win;
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
    if (!this.overlayWindow || this.overlayWindow.isDestroyed() || !this.overlayWindow.isVisible()) {
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

  async getState(): Promise<SpriteOverlaySettings> {
    const bounds = await getSetting('spriteOverlayBounds').catch(() => null);
    const enabled = await getSetting('spriteOverlayEnabled').catch(() => true);
    return {
      enabled,
      supported: this.isSupported(),
      visible: Boolean(this.overlayWindow && !this.overlayWindow.isDestroyed() && this.overlayWindow.isVisible()),
      bounds,
    };
  }

  focusMainWindow(): void {
    const mainWindow = this.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }

  destroy(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    this.overlayWindow.destroy();
    this.overlayWindow = null;
  }
}
