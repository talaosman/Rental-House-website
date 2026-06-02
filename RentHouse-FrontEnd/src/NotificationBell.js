import React, { useState, useEffect, useRef } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import "./NotificationBell.css";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef(null);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      const newNotif = {
        id: Date.now(),
        title: payload.notification?.title || "New Notification",
        body: payload.notification?.body || "",
        houseId: payload.data?.houseId,
        time: new Date().toLocaleTimeString(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
      setUnread((prev) => prev + 1);

      // Also show browser notification manually for foreground
      if (Notification.permission === "granted") {
        new Notification(newNotif.title, {
          body: newNotif.body,
          icon: "/logo192.png",
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) setUnread(0);
  };

  const handleNotifClick = (notif) => {
    if (notif.houseId) {
      window.location.href = `/property/${notif.houseId}`;
    }
    setNotifications((prev) =>
      prev.map((n) => n.id === notif.id ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
    setUnread(0);
    setOpen(false);
  };

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="notif-clear" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.read ? "notif-unread" : ""}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="notif-icon">🏠</div>
                  <div className="notif-text">
                    <p className="notif-title">{notif.title}</p>
                    <p className="notif-body">{notif.body}</p>
                    <span className="notif-time">{notif.time}</span>
                  </div>
                  {!notif.read && <div className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;