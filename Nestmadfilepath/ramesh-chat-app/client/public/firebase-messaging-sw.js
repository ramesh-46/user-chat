/* public/firebase-messaging-sw.js */
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyDzp6kd2uZHc6Pt7SZ-78I9PNKM6ZECXys",
  authDomain:        "rameshchat-e26f9.firebaseapp.com",
  projectId:         "rameshchat-e26f9",
  storageBucket:     "rameshchat-e26f9.appspot.com",
  messagingSenderId: "789121436959",
  appId:             "1:789121436959:web:8739c527013b5a5d04742a"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(({ notification }) => {
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: "/logo192.png",
  });
});
