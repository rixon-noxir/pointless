export function askForNotifications() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}

/** Show a notification through the service worker when installed, else directly. Never throws. */
export async function showNote(title: string, body?: string, url = '/') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, { body, tag: `${title}-${url}`, data: { url } });
        return;
      }
    }
    new Notification(title, { body, tag: `${title}-${url}` });
  } catch {
    /* some browsers only allow one path or the other */
  }
}
