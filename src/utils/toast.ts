// Safe UI notification helper to avoid window.alert in iframe environments

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class ToastManager {
  private toasts: ToastMessage[] = [];
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(text: string, type: ToastType = 'info', durationMs: number = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { id, text, type };
    this.toasts = [...this.toasts, newToast];
    this.emit();

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.emit();
  }

  private emit() {
    this.listeners.forEach(l => l([...this.toasts]));
  }
}

export const toastManager = new ToastManager();

export const showToast = (text: string, type: ToastType = 'info') => {
  toastManager.notify(text, type);
};
