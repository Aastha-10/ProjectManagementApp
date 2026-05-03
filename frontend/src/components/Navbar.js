import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await API.get("/inbox/unread-count");
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    window.addEventListener("inboxUnreadChanged", fetchUnreadCount);
    window.addEventListener("focus", fetchUnreadCount);
    const intervalId = setInterval(fetchUnreadCount, 15000);

    return () => {
      window.removeEventListener("inboxUnreadChanged", fetchUnreadCount);
      window.removeEventListener("focus", fetchUnreadCount);
      clearInterval(intervalId);
    };
  }, [fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link to="/dashboard" style={styles.logo}>TaskFlow</Link>
        <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
        <Link to="/projects" style={styles.navLink}>Projects</Link>
        <Link to="/tasks" style={styles.navLink}>Tasks</Link>
        <Link to="/kanban" style={styles.navLink}>My Board</Link>
        <Link to="/inbox" style={{ ...styles.navLink, ...styles.inboxLink }}>
          Inbox
          {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount}</span>}
        </Link>
      </div>
      <div style={styles.right}>
        <span style={styles.userBadge}>
          {user?.role === "admin" ? " Admin" : " Member"}
        </span>
        <span style={styles.userName}>{user?.name}</span>
        <button style={styles.themeBtn} onClick={toggleTheme} type="button">
          {isDark ? "Light" : "Dark"}
        </button>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    minHeight: "68px",
    background: "var(--nav-bg)",
    boxShadow: "var(--shadow)",
    backdropFilter: "blur(18px)",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    fontFamily: "'Segoe UI', sans-serif",
  },
  left: { display: "flex", alignItems: "center", gap: "24px" },
  logo: {
    fontSize: "22px",
    fontWeight: "900",
    color: "var(--brand)",
    textDecoration: "none",
    marginRight: "16px",
    letterSpacing: "0",
  },
  navLink: {
    color: "var(--muted)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: "800",
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "background 0.2s, color 0.2s, transform 0.2s",
  },
  inboxLink: { position: "relative" },
  unreadBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    minWidth: "18px",
    height: "18px",
    padding: "0 5px",
    borderRadius: "999px",
    background: "#dc2626",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "800",
    lineHeight: "18px",
    textAlign: "center",
    boxSizing: "border-box",
  },
  right: { display: "flex", alignItems: "center", gap: "16px" },
  userBadge: {
    background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)",
    color: "#fff",
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "900",
  },
  userName: { fontSize: "14px", color: "var(--text)", fontWeight: "800" },
  themeBtn: {
    padding: "8px 14px",
    background: "var(--surface-soft)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "900",
  },
  logoutBtn: {
    padding: "8px 18px",
    background: "transparent",
    color: "var(--danger)",
    border: "1px solid var(--danger)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
};
