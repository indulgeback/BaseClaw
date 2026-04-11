import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  browserWindowCtor,
  browserWindowInstances,
  mainWindowMock,
  getSettingMock,
  setSettingMock,
} = vi.hoisted(() => {
  const browserWindowInstances: MockBrowserWindow[] = [];

  class MockBrowserWindow {
    visible = false;
    destroyed = false;
    bounds = { x: 100, y: 120, width: 280, height: 320 };
    listeners = new Map<string, (...args: unknown[]) => void>();
    webContents = {
      send: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        this.listeners.set(`web:${event}`, handler);
      }),
    };
    loadURL = vi.fn(async () => {});
    show = vi.fn(() => { this.visible = true; });
    hide = vi.fn(() => { this.visible = false; });
    isVisible = vi.fn(() => this.visible);
    isDestroyed = vi.fn(() => this.destroyed);
    getBounds = vi.fn(() => this.bounds);
    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this.listeners.set(event, handler);
      return this;
    });
    destroy = vi.fn(() => {
      this.destroyed = true;
    });
  }

  const browserWindowCtor = vi.fn(class extends MockBrowserWindow {
    constructor(options: unknown) {
      super();
      Object.assign(this.bounds, options && typeof options === 'object'
        ? {
            x: (options as Record<string, number>).x ?? this.bounds.x,
            y: (options as Record<string, number>).y ?? this.bounds.y,
            width: (options as Record<string, number>).width ?? this.bounds.width,
            height: (options as Record<string, number>).height ?? this.bounds.height,
          }
        : {});
      browserWindowInstances.push(this);
    }
  });

  const mainWindowMock = {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  };

  return {
    browserWindowCtor,
    browserWindowInstances,
    mainWindowMock,
    getSettingMock: vi.fn(),
    setSettingMock: vi.fn(async () => {}),
  };
});

vi.mock('electron', () => ({
  BrowserWindow: browserWindowCtor,
  app: {},
  screen: {
    getPrimaryDisplay: () => ({
      workArea: { x: 0, y: 0, width: 1440, height: 900 },
    }),
  },
}));

vi.mock('@electron/utils/store', () => ({
  getSetting: getSettingMock,
  setSetting: setSettingMock,
}));

describe('sprite overlay manager', () => {
  beforeEach(() => {
    browserWindowCtor.mockClear();
    browserWindowInstances.length = 0;
    getSettingMock.mockReset();
    setSettingMock.mockClear();
    mainWindowMock.show.mockClear();
    mainWindowMock.focus.mockClear();
    mainWindowMock.restore.mockClear();
  });

  it('creates and shows the overlay on the first sync when enabled', async () => {
    getSettingMock.mockImplementation(async (key: string) => {
      if (key === 'spriteOverlayEnabled') return true;
      if (key === 'spriteOverlayBounds') return null;
      return null;
    });

    const { SpriteOverlayManager } = await import('@electron/main/sprite-overlay');
    const manager = new SpriteOverlayManager(() => mainWindowMock as never);

    await manager.syncState({
      characterId: 'raccoon',
      state: 'idle',
      title: 'Sprite calm',
      subtitle: 'Everything is steady.',
      timestamp: Date.now(),
    });

    expect(browserWindowCtor).toHaveBeenCalledTimes(1);
    expect(browserWindowInstances[0]?.show).toHaveBeenCalled();
    expect(browserWindowInstances[0]?.webContents.send).toHaveBeenCalledWith(
      'sprite:overlay-state',
      expect.objectContaining({ state: 'idle' }),
    );
  });

  it('hides the overlay and focuses the main window when requested', async () => {
    getSettingMock.mockImplementation(async (key: string) => {
      if (key === 'spriteOverlayEnabled') return true;
      if (key === 'spriteOverlayBounds') return null;
      return null;
    });

    const { SpriteOverlayManager } = await import('@electron/main/sprite-overlay');
    const manager = new SpriteOverlayManager(() => mainWindowMock as never);

    await manager.show();
    await manager.hide();
    manager.focusMainWindow();

    expect(browserWindowInstances[0]?.hide).toHaveBeenCalled();
    expect(mainWindowMock.show).toHaveBeenCalled();
    expect(mainWindowMock.focus).toHaveBeenCalled();
  });
});
