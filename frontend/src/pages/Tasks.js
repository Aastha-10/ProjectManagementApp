import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: "",
    assignedTo: "",
    deadline: "",
    priority: 3,
  });
  const { user } = useAuth();
  const location = useLocation();
  const queryFilter = new URLSearchParams(location.search).get("filter");

  useEffect(() => {
    fetchTasks();
    if (user?.role === "admin") {
      fetchUsers();
      fetchProjects();
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks");
      let data = res.data;

      if (queryFilter === "overdue") {
        data = data.filter(t => t.status !== "done" && new Date(t.deadline) < new Date());
      } else if (queryFilter && queryFilter !== "all") {
        data = data.filter(t => t.status === queryFilter);
      }

      setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await API.get("/auth/users");
    setUsers(res.data);
  };

  const fetchProjects = async () => {
    const res = await API.get("/projects");
    setProjects(res.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/tasks", { ...form, taskType: "task" });
      setForm({ title: "", description: "", projectId: "", assignedTo: "", deadline: "", priority: 3 });
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to create task");
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await API.patch(`/tasks/${taskId}/status`, { status });
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to update status");
    }
  };

  const statusColors = {
    "todo": { bg: "#fff7ed", color: "#ed8936", label: "To Do" },
    "in-progress": { bg: "#ebf8ff", color: "#3182ce", label: "In Progress" },
    "done": { bg: "#f0fff4", color: "#38a169", label: "Done" },
  };

  const isOverdue = (deadline, status) => {
    return status !== "done" && new Date(deadline) < new Date();
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Tasks</h1>
            <p style={styles.subtitle}>
              {user?.role === "admin" ? "Manage assigned member tasks" : "Your assigned tasks"}
            </p>
          </div>
          {user?.role === "admin" && (
            <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
              + New Task
            </button>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>
              Create Member Task
            </h3>
            <form onSubmit={handleCreate}>
              <input
                style={styles.input}
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <input
                style={styles.input}
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {user?.role === "admin" && (
                <>
                  <select
                    style={styles.input}
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  >
                    <option value="">Select project (optional)</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    style={styles.input}
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Assign to member</option>
                    {users.filter((u) => u.role === "member").map((u) => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </>
              )}
              <input
                style={styles.input}
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
              <select
                style={styles.input}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((priority) => (
                  <option key={priority} value={priority}>
                    Priority {priority}/5
                  </option>
                ))}
              </select>
              <div style={styles.formButtons}>
                <button style={styles.btn} type="submit">Create Task</button>
                <button style={styles.btnOutline} type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={styles.empty}>No tasks yet!</div>
        ) : (
          <div style={styles.taskList}>
            {tasks.map((task) => (
              <div
                key={task._id}
                style={{
                  ...styles.taskCard,
                  borderLeft: `4px solid ${statusColors[task.status]?.color}`,
                }}
              >
                <div style={styles.taskHeader}>
                  <div>
                    <h3 style={styles.taskTitle}>{task.title}</h3>
                    <p style={styles.taskDesc}>{task.description}</p>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    background: statusColors[task.status]?.bg,
                    color: statusColors[task.status]?.color,
                  }}>
                    {statusColors[task.status]?.label}
                  </span>
                </div>

                <div style={styles.taskMeta}>
                  <span style={styles.metaItem}>
                    📁 {task.projectId?.name || "Unknown project"}
                  </span>
                  <span style={styles.metaItem}>
                    👤 {task.assignedTo?.name || "Unassigned"}
                  </span>
                  {task.deadline && (
                    <span style={{
                      ...styles.metaItem,
                      color: isOverdue(task.deadline, task.status) ? "#e53e3e" : "#888"
                    }}>
                      📅 {new Date(task.deadline).toLocaleDateString()}
                      {isOverdue(task.deadline, task.status) && " ⚠️ Overdue"}
                    </span>
                  )}
                  <span style={styles.priorityBadge}>
                    Priority {task.priority || 3}/5
                  </span>
                </div>

                <div style={styles.statusButtons}>
                  {["todo", "in-progress", "done"].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(task._id, s)}
                      style={{
                        ...styles.statusBtn,
                        background: task.status === s ? statusColors[s].color : "#f7f8fc",
                        color: task.status === s ? "#fff" : "#888",
                        border: `1px solid ${task.status === s ? statusColors[s].color : "#e2e8f0"}`,
                      }}
                    >
                      {statusColors[s].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Segoe UI', sans-serif" },
  container: { maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" },
  title: { fontSize: "28px", fontWeight: "700", color: "#1a1a2e", margin: 0 },
  subtitle: { color: "#888", fontSize: "15px", marginTop: "6px" },
  error: { background: "#fff0f0", color: "#e53e3e", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" },
  loading: { textAlign: "center", color: "#888", padding: "60px", fontSize: "16px" },
  empty: { textAlign: "center", color: "#aaa", padding: "60px", fontSize: "16px" },
  btn: { padding: "10px 20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" },
  btnOutline: { padding: "10px 20px", background: "#fff", color: "#667eea", border: "1px solid #667eea", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600", marginLeft: "8px" },
  formCard: { background: "#fff", borderRadius: "16px", padding: "28px", marginBottom: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  formTitle: { fontSize: "18px", fontWeight: "600", color: "#1a1a2e", marginTop: 0, marginBottom: "20px" },
  formButtons: { display: "flex", marginTop: "16px" },
  input: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box", outline: "none" },
  taskList: { display: "flex", flexDirection: "column", gap: "16px" },
  taskCard: { background: "#fff", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  taskHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  taskTitle: { fontSize: "16px", fontWeight: "600", color: "#1a1a2e", margin: "0 0 4px" },
  taskDesc: { fontSize: "14px", color: "#888", margin: 0 },
  statusBadge: { padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" },
  taskMeta: { display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" },
  metaItem: { fontSize: "13px", color: "#888" },
  priorityBadge: { fontSize: "13px", color: "#7c3aed", background: "#f5f3ff", borderRadius: "999px", padding: "3px 10px", fontWeight: "700" },
  statusButtons: { display: "flex", gap: "8px" },
  statusBtn: { padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" },
};
