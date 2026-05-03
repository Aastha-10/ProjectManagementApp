import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { id: "direct", label: "Direct" },
  { id: "broadcast", label: "Broadcasts" },
  { id: "post", label: "Posts" },
  { id: "project-file", label: "Project Files" },
];

const emptyForm = {
  body: "",
  assignmentTitle: "",
  projectId: "",
  recipientIds: [],
  attachments: [],
};

const readFiles = (files) => {
  return Promise.all(
    Array.from(files).map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result,
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }))
  );
};

export default function Inbox() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("direct");
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);

  const visibleTabs = useMemo(
    () => user?.role === "admin" ? tabs : tabs.filter((tab) => tab.id === "direct"),
    [user?.role]
  );
  const selectedUser = users.find((item) => item._id === selectedUserId);
  const memberUsers = useMemo(() => users.filter((item) => item.role === "member"), [users]);

  const fetchSetup = useCallback(async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        API.get("/inbox/users"),
        user?.role === "admin" ? API.get("/projects") : Promise.resolve({ data: [] }),
      ]);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setSelectedUserId(usersRes.data[0]?._id || "");
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to load inbox");
    }
  }, [user?.role]);

  const clearUnreadMessages = useCallback(async () => {
    try {
      const res = await API.get("/inbox/unread-count");
      setUnreadAtOpen(res.data.count || 0);
      await API.post("/inbox/read");
      window.dispatchEvent(new Event("inboxUnreadChanged"));
    } catch (err) {
      // The inbox should still render even if notification sync fails.
    }
  }, []);

  useEffect(() => {
    fetchSetup();
    clearUnreadMessages();
  }, [fetchSetup, clearUnreadMessages]);

  useEffect(() => {
    if (user?.role !== "admin" && activeTab !== "direct") {
      setActiveTab("direct");
    }
  }, [activeTab, user?.role]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "direct") {
        if (!selectedUserId) {
          setMessages([]);
          return;
        }
        const res = await API.get(`/inbox/messages?type=direct&userId=${selectedUserId}`);
        setMessages(res.data);
      } else if (activeTab === "project-file") {
        const query = form.projectId ? `&projectId=${form.projectId}` : "";
        const res = await API.get(`/inbox/messages?type=project-file${query}`);
        setMessages(res.data);
      } else {
        const res = await API.get(`/inbox/messages?type=${activeTab}`);
        setMessages(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedUserId, form.projectId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleFiles = async (e) => {
    const attachments = await readFiles(e.target.files);
    setForm({ ...form, attachments });
  };

  const resetComposer = () => {
    setForm({ ...emptyForm, projectId: form.projectId });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (activeTab === "direct") {
        await API.post("/inbox/direct", {
          recipientId: selectedUserId,
          body: form.body,
          attachments: form.attachments,
        });
      } else if (activeTab === "broadcast") {
        await API.post("/inbox/broadcast", {
          recipientIds: form.recipientIds,
          body: form.body,
          attachments: form.attachments,
        });
      } else if (activeTab === "post") {
        await API.post("/inbox/posts", {
          body: form.body,
          attachments: form.attachments,
        });
      } else {
        await API.post("/inbox/project-files", {
          projectId: form.projectId,
          assignmentTitle: form.assignmentTitle,
          body: form.body,
          attachments: form.attachments,
        });
      }

      resetComposer();
      fetchMessages();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to send");
    }
  };

  const toggleRecipient = (id) => {
    const exists = form.recipientIds.includes(id);
    setForm({
      ...form,
      recipientIds: exists
        ? form.recipientIds.filter((recipientId) => recipientId !== id)
        : [...form.recipientIds, id],
    });
  };

  const canCompose = activeTab === "direct" || user?.role === "admin";

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Inbox</h1>
            <p style={styles.subtitle}>Chat, broadcasts, posts, and shared project material.</p>
            {unreadAtOpen > 0 && (
              <span style={styles.unreadPill}>
                {unreadAtOpen} new message{unreadAtOpen === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.tabs}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              style={activeTab === tab.id ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.layout}>
          <aside style={styles.sidePanel}>
            {activeTab === "direct" && (
              <>
                <h2 style={styles.panelTitle}>People</h2>
                {users.map((item) => (
                  <button
                    key={item._id}
                    style={selectedUserId === item._id ? styles.userActive : styles.userButton}
                    onClick={() => setSelectedUserId(item._id)}
                    type="button"
                  >
                    <span style={styles.userName}>{item.name}</span>
                    <span style={styles.userRole}>{item.role}</span>
                  </button>
                ))}
              </>
            )}

            {activeTab === "broadcast" && (
              <>
                <h2 style={styles.panelTitle}>Recipients</h2>
                {user?.role !== "admin" ? (
                  <p style={styles.muted}>Broadcasts are sent by admins.</p>
                ) : (
                  <>
                    <p style={styles.muted}>Leave all unchecked to send to every member.</p>
                    {memberUsers.map((item) => (
                      <label key={item._id} style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={form.recipientIds.includes(item._id)}
                          onChange={() => toggleRecipient(item._id)}
                        />
                        {item.name}
                      </label>
                    ))}
                  </>
                )}
              </>
            )}

            {activeTab === "project-file" && (
              <>
                <h2 style={styles.panelTitle}>Project</h2>
                <select
                  style={styles.input}
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                >
                  <option value="">All project files</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </>
            )}

            {activeTab === "post" && (
              <>
                <h2 style={styles.panelTitle}>Team Feed</h2>
                <p style={styles.muted}>Posts are visible to everyone using the app.</p>
              </>
            )}
          </aside>

          <main style={styles.mainPanel}>
            <div style={styles.threadHeader}>
              <h2 style={styles.threadTitle}>
                {activeTab === "direct" && (selectedUser ? `Chat with ${selectedUser.name}` : "Select a person")}
                {activeTab === "broadcast" && "Admin Broadcasts"}
                {activeTab === "post" && "Team Posts"}
                {activeTab === "project-file" && "Project Files and Assignments"}
              </h2>
            </div>

            <div style={styles.messages}>
              {loading ? (
                <div style={styles.empty}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={styles.empty}>Nothing here yet.</div>
              ) : (
                messages.map((message) => (
                  <article key={message._id} style={styles.messageCard}>
                    <div style={styles.messageTop}>
                      <strong>{message.sender?.name || "Unknown"}</strong>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    {message.projectId?.name && <span style={styles.projectTag}>{message.projectId.name}</span>}
                    {message.assignmentTitle && <h3 style={styles.assignmentTitle}>{message.assignmentTitle}</h3>}
                    {message.body && <p style={styles.messageBody}>{message.body}</p>}
                    {message.attachments?.length > 0 && (
                      <div style={styles.attachments}>
                        {message.attachments.map((file, index) => (
                          <a
                            key={`${file.name}-${index}`}
                            href={file.dataUrl}
                            download={file.name}
                            style={styles.attachment}
                          >
                            {file.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>

            {canCompose ? (
              <form style={styles.composer} onSubmit={handleSend}>
                {activeTab === "project-file" && (
                  <>
                    <select
                      style={styles.input}
                      value={form.projectId}
                      onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                      required
                    >
                      <option value="">Select project</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>{project.name}</option>
                      ))}
                    </select>
                    <input
                      style={styles.input}
                      placeholder="Assignment or document title"
                      value={form.assignmentTitle}
                      onChange={(e) => setForm({ ...form, assignmentTitle: e.target.value })}
                    />
                  </>
                )}

                <textarea
                  style={styles.textarea}
                  placeholder={
                    activeTab === "broadcast"
                      ? "Write a broadcast"
                      : activeTab === "post"
                        ? "Write a post"
                        : activeTab === "project-file"
                          ? "Add notes for the shared material"
                          : "Write a message"
                  }
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />

                <div style={styles.composerActions}>
                  <input style={styles.fileInput} type="file" multiple onChange={handleFiles} />
                  <span style={styles.muted}>
                    {form.attachments.length > 0 ? `${form.attachments.length} file(s) ready` : "No files selected"}
                  </span>
                  <button style={styles.sendBtn} type="submit">Send</button>
                </div>
              </form>
            ) : (
              <div style={styles.readOnly}>Only admins can send broadcasts.</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Segoe UI', sans-serif" },
  container: { maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" },
  header: { marginBottom: "18px" },
  title: { fontSize: "28px", color: "#111827", margin: 0 },
  subtitle: { color: "#64748b", margin: "6px 0 0", fontSize: "15px" },
  unreadPill: { display: "inline-flex", marginTop: "10px", background: "#dc2626", color: "#fff", borderRadius: "999px", padding: "5px 11px", fontSize: "12px", fontWeight: "800" },
  error: { background: "#fef2f2", color: "#b91c1c", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  tab: { border: "1px solid #dbe3ef", background: "#fff", color: "#475569", borderRadius: "8px", padding: "9px 14px", cursor: "pointer", fontWeight: "700" },
  tabActive: { border: "1px solid #4f46e5", background: "#eef2ff", color: "#4338ca", borderRadius: "8px", padding: "9px 14px", cursor: "pointer", fontWeight: "800" },
  layout: { display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: "18px", alignItems: "start" },
  sidePanel: { background: "#fff", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 12px rgba(15,23,42,0.06)" },
  mainPanel: { background: "#fff", borderRadius: "8px", minHeight: "620px", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column" },
  panelTitle: { fontSize: "15px", margin: "0 0 12px", color: "#111827" },
  muted: { color: "#64748b", fontSize: "13px" },
  userButton: { width: "100%", textAlign: "left", border: "1px solid #e2e8f0", background: "#fff", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px", cursor: "pointer" },
  userActive: { width: "100%", textAlign: "left", border: "1px solid #4f46e5", background: "#eef2ff", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px", cursor: "pointer" },
  userName: { display: "block", color: "#111827", fontWeight: "800", fontSize: "14px" },
  userRole: { color: "#64748b", fontSize: "12px" },
  checkRow: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", color: "#334155", fontSize: "14px" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #dbe3ef", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginBottom: "10px", outline: "none" },
  threadHeader: { padding: "18px 20px", borderBottom: "1px solid #e2e8f0" },
  threadTitle: { fontSize: "18px", margin: 0, color: "#111827" },
  messages: { padding: "18px 20px", flex: 1, overflowY: "auto" },
  empty: { color: "#94a3b8", textAlign: "center", padding: "56px 0" },
  messageCard: { border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "12px", background: "#fff" },
  messageTop: { display: "flex", justifyContent: "space-between", gap: "12px", color: "#334155", fontSize: "13px", marginBottom: "8px" },
  projectTag: { display: "inline-block", color: "#4338ca", background: "#eef2ff", borderRadius: "999px", padding: "3px 9px", fontSize: "12px", fontWeight: "800", marginBottom: "8px" },
  assignmentTitle: { fontSize: "15px", margin: "4px 0 6px", color: "#111827" },
  messageBody: { color: "#334155", lineHeight: 1.45, fontSize: "14px", margin: "0 0 10px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  attachments: { display: "flex", gap: "8px", flexWrap: "wrap" },
  attachment: { color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", textDecoration: "none", fontWeight: "700" },
  composer: { borderTop: "1px solid #e2e8f0", padding: "16px 20px" },
  textarea: { width: "100%", minHeight: "88px", padding: "11px 12px", border: "1px solid #dbe3ef", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", outline: "none" },
  composerActions: { display: "flex", alignItems: "center", gap: "12px", marginTop: "10px", flexWrap: "wrap" },
  fileInput: { fontSize: "13px" },
  sendBtn: { marginLeft: "auto", padding: "10px 18px", border: "none", background: "#4f46e5", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "800" },
  readOnly: { borderTop: "1px solid #e2e8f0", padding: "18px 20px", color: "#64748b" },
};
