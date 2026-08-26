type Callback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<Callback>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: Callback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      this.off(event, callback);
    };
  }

  public once(event: string, callback: Callback): () => void {
    const unbind = this.on(event, (...args: any[]) => {
      unbind();
      callback(...args);
    });
    return unbind;
  }

  public off(event: string, callback: Callback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit(event: string, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((callback) => {
        try {
          callback(...args);
        } catch (err) {
          console.error(`[EventBus] Error in event listener for "${event}":`, err);
        }
      });
    }
  }
}

export const eventBus = EventBus.getInstance();
