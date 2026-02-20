export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    const set = this.listeners.get(eventName);
    set.add(handler);
    return () => set.delete(handler);
  }

  emit(eventName, payload = {}) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.forEach((handler) => handler(payload));
  }
}
