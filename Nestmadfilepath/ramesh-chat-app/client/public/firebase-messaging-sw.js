self.addEventListener("push", (event) => {
  if (!event.data) return;
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data.json(); } catch (_) { try { payload = { body: event.data.text() }; } catch (_) {} }
    const data = payload.data || payload;
    const type = data.type || "message";
    const title = data.title || (type === "incoming_call" ? "Incoming call — SURA Chat" : "SURA Chat");
    const body = data.body || (type === "incoming_call" ? (data.mode === "video" ? "Incoming video call" : "Incoming voice call") : "You have a new message");
    const options = { body, icon: "/logo192.png", badge: "/favicon.ico", tag: data.tag || (type === "incoming_call" ? "sura-incoming-call" : "sura-message"), renotify: type === "incoming_call", requireInteraction: type === "incoming_call", data: { url: data.url || "/", type, senderId: data.senderId || "", mode: data.mode || "audio" } };
    if (type === "incoming_call") { options.actions = [{ action: "open", title: "Open SURA Chat" }]; options.vibrate = [300,100,300,100,500]; }
    await self.registration.showNotification(title, options);
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  const target = new URL(info.url || "/", self.location.origin);
  if (info.type === "incoming_call" && info.senderId) { target.searchParams.set("callFrom", info.senderId); target.searchParams.set("callMode", info.mode || "audio"); }
  else if (info.type === "group_message" && info.groupId) target.searchParams.set("openGroup", info.groupId);
  else if (info.senderId) target.searchParams.set("openChat", info.senderId);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) if (new URL(client.url).origin === self.location.origin) { await client.navigate(target.href); return client.focus(); }
    return self.clients.openWindow(target.href);
  })());
});