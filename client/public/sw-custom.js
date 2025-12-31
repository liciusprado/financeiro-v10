/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received", event);

  if (!event.data) {
    console.warn("[SW] Push event has no data");
    return;
  }

  let notification: any;
  try {
    notification = event.data.json();
  } catch (error) {
    console.error("[SW] Error parsing notification data", error);
    return;
  }

  const {
    title = "Planejamento Financeiro",
    body = "",
    icon = "/icons/icon-192x192.png",
    badge = "/icons/icon-192x192.png",
    image,
    data = {},
    actions = [],
    tag = "default",
    requireInteraction = false,
  } = notification;

  const options: NotificationOptions = {
    body,
    icon,
    badge,
    image,
    data,
    tag,
    requireInteraction,
    vibrate: [200, 100, 200],
    actions: actions.map((action: any) => ({
      action: action.action,
      title: action.title,
      icon: action.icon,
    })),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked", event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";
  const action = event.action;

  // Handle action clicks
  let targetUrl = urlToOpen;
  if (action) {
    switch (action) {
      case "view":
      case "view-details":
        targetUrl = urlToOpen;
        break;
      case "view-charts":
        targetUrl = "/graficos";
        break;
      case "view-analytics":
        targetUrl = "/analitico";
        break;
      case "view-goals":
        targetUrl = "/metas";
        break;
      default:
        targetUrl = urlToOpen;
    }
  }

  // Open or focus the app
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.origin) && "focus" in client) {
            // App is open - focus and navigate
            return client.focus().then(() => {
              if ("navigate" in client) {
                return (client as any).navigate(targetUrl);
              }
            });
          }
        }

        // App is not open - open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Background sync for failed notifications (optional enhancement)
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync", event);
  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Implement sync logic if needed
  console.log("[SW] Syncing notifications...");
}

// Export empty object to make this a module
export {};
