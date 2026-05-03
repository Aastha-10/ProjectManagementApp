import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get("/tasks/dashboard"),
      API.get("/inbox/messages?type=post"),
    ])
      .then(([statsRes, postsRes]) => {
        setStats(statsRes.data);
        setPosts(postsRes.data.slice(-5).reverse());
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Tasks", value: stats?.total, color: "#6366f1", filter: "all" },
    { label: "To Do", value: stats?.todo, color: "#f59e0b", filter: "todo" },
    { label: "In Progress", value: stats?.inProgress, color: "#0ea5e9", filter: "in-progress" },
    { label: "Done", value: stats?.done, color: "#22c55e", filter: "done" },
    { label: "Overdue", value: stats?.overdue, color: "#ef4444", filter: "overdue" },
  ];

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.container}>
        <section className="hero-visual animated-card" style={styles.hero}>
          <div style={styles.heroContent}>
            <span style={styles.kicker}>Workspace overview</span>
            <h1 style={styles.title}>Welcome back, {user?.name}</h1>
            <p style={styles.subtitle}>
              Track work, catch priorities, and keep the team moving from one clean command center.
            </p>
            <div style={styles.heroStats}>
              <span style={styles.heroPill}>Role: {user?.role}</span>
              <span style={styles.heroPill}>{stats?.overdue || 0} overdue</span>
              <span style={styles.heroPill}>{posts.length} recent posts</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div style={styles.loading}>Loading dashboard...</div>
        ) : (
          <>
            <section style={styles.grid}>
              {cards.map((card, index) => (
                <button
                  key={card.label}
                  className="animated-card interactive-card"
                  style={{
                    ...styles.card,
                    animationDelay: `${index * 70}ms`,
                    borderTop: `4px solid ${card.color}`,
                  }}
                  onClick={() => navigate(`/tasks?filter=${card.filter}`)}
                  type="button"
                >
                  <span className="pulse-dot" style={{ ...styles.cardDot, background: card.color }} />
                  <div style={{ ...styles.cardValue, color: card.color }}>{card.value ?? 0}</div>
                  <div style={styles.cardLabel}>{card.label}</div>
                  <div style={styles.cardBar}>
                    <div
                      style={{
                        ...styles.cardBarFill,
                        background: card.color,
                        width: `${Math.min(((card.value ?? 0) / (stats?.total || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span style={styles.clickHint}>View tasks</span>
                </button>
              ))}
            </section>

            <section style={styles.contentGrid}>
              <div className="animated-card" style={styles.infoBox}>
                <span style={styles.sectionEyebrow}>Today</span>
                <h2 style={styles.infoTitle}>Quick Summary</h2>
                <p style={styles.infoText}>
                  You have <strong>{stats?.inProgress}</strong> tasks in progress and{" "}
                  <strong>{stats?.todo}</strong> tasks waiting to be started.
                  {stats?.overdue > 0 && (
                    <span style={styles.warningText}> {stats?.overdue} tasks need attention.</span>
                  )}
                </p>
              </div>

              <div className="animated-card" style={styles.imagePanel}>
                <div style={styles.imageOverlay}>
                  <span style={styles.sectionEyebrow}>Focus</span>
                  <strong style={styles.imageTitle}>Plan. Assign. Deliver.</strong>
                </div>
              </div>
            </section>

            <section className="animated-card" style={styles.postsBox}>
              <div style={styles.sectionHeader}>
                <div>
                  <span style={styles.sectionEyebrow}>Updates</span>
                  <h2 style={styles.infoTitle}>New Posts</h2>
                </div>
              </div>
              {posts.length === 0 ? (
                <p style={styles.emptyPosts}>Nothing posted yet.</p>
              ) : (
                posts.map((post) => (
                  <article key={post._id} style={styles.postCard}>
                    <div style={styles.postTop}>
                      <strong>{post.sender?.name || "Admin"}</strong>
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                    {post.body && <p style={styles.postBody}>{post.body}</p>}
                    {post.attachments?.length > 0 && (
                      <div style={styles.postAttachments}>
                        {post.attachments.map((file, index) => (
                          <a
                            key={`${file.name}-${index}`}
                            href={file.dataUrl}
                            download={file.name}
                            style={styles.postAttachment}
                          >
                            {file.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--page-bg)", fontFamily: "'Segoe UI', sans-serif", color: "var(--text)" },
  container: { maxWidth: "1180px", margin: "0 auto", padding: "34px 24px 56px" },
  hero: { minHeight: "320px", borderRadius: "18px", display: "flex", alignItems: "flex-end", padding: "34px", boxShadow: "var(--shadow)", overflow: "hidden", marginBottom: "26px" },
  heroContent: { maxWidth: "720px", color: "#fff" },
  kicker: { display: "inline-block", textTransform: "uppercase", fontSize: "12px", fontWeight: "900", letterSpacing: "0", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "999px", padding: "7px 12px", marginBottom: "14px" },
  title: { fontSize: "44px", lineHeight: 1.02, fontWeight: "950", margin: "0 0 12px", letterSpacing: "0" },
  subtitle: { color: "rgba(255,255,255,0.86)", fontSize: "17px", fontWeight: "650", maxWidth: "640px", lineHeight: 1.55, margin: 0 },
  heroStats: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "22px" },
  heroPill: { background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.24)", borderRadius: "999px", padding: "8px 12px", fontSize: "13px", fontWeight: "850" },
  loading: { textAlign: "center", color: "var(--muted)", padding: "60px", fontSize: "16px", fontWeight: "800" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(188px, 1fr))", gap: "18px", marginBottom: "24px" },
  card: { position: "relative", textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px 18px", boxShadow: "var(--shadow)", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", color: "var(--text)" },
  cardDot: { position: "absolute", right: "16px", top: "16px", width: "11px", height: "11px", borderRadius: "999px" },
  cardValue: { fontSize: "44px", fontWeight: "950", lineHeight: 1 },
  cardLabel: { fontSize: "14px", color: "var(--text)", marginTop: "9px", fontWeight: "900" },
  cardBar: { height: "7px", background: "var(--surface-soft)", borderRadius: "999px", marginTop: "18px", overflow: "hidden" },
  cardBarFill: { height: "100%", borderRadius: "999px", transition: "width 0.55s ease" },
  clickHint: { display: "inline-block", color: "var(--muted)", fontSize: "12px", marginTop: "12px", fontWeight: "900" },
  contentGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: "22px", marginBottom: "24px" },
  infoBox: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", boxShadow: "var(--shadow)" },
  sectionEyebrow: { color: "var(--brand-2)", textTransform: "uppercase", fontSize: "12px", fontWeight: "950", letterSpacing: "0" },
  infoTitle: { fontSize: "24px", fontWeight: "950", color: "var(--text)", margin: "6px 0 10px", letterSpacing: "0" },
  infoText: { fontSize: "16px", color: "var(--muted)", lineHeight: 1.75, fontWeight: "650", margin: 0 },
  warningText: { color: "var(--danger)", fontWeight: "900" },
  imagePanel: { minHeight: "220px", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--shadow)", backgroundImage: "linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.72)), url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80')", backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "flex-end" },
  imageOverlay: { padding: "22px", color: "#fff" },
  imageTitle: { display: "block", fontSize: "24px", fontWeight: "950", marginTop: "8px" },
  postsBox: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", boxShadow: "var(--shadow)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" },
  emptyPosts: { color: "var(--muted)", margin: 0, fontSize: "14px", fontWeight: "800" },
  postCard: { border: "1px solid var(--border)", background: "var(--surface-solid)", borderRadius: "12px", padding: "16px", marginTop: "12px" },
  postTop: { display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--muted)", fontSize: "13px", marginBottom: "8px", fontWeight: "800" },
  postBody: { color: "var(--text)", fontSize: "15px", lineHeight: 1.55, margin: "0 0 10px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontWeight: "650" },
  postAttachments: { display: "flex", gap: "8px", flexWrap: "wrap" },
  postAttachment: { color: "var(--brand)", background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", textDecoration: "none", fontWeight: "900" },
};
