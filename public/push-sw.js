self.addEventListener("push", (event) => {
  const message = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(message.title || "Chores List", {
    body: message.body || "You have a new update.",
    icon: "/Icon.png",
    badge: "/favicon.ico",
    data: { url: message.url || "/screen/tasks" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/screen/tasks"));
});
