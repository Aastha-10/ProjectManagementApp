import { useEffect, useState } from "react";
import API from "../api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [memberId, setMemberId] = useState("");
  const [leaderByProject, setLeaderByProject] = useState({});
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
    if (user?.role === "admin") fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
      setLeaderByProject(
        res.data.reduce((acc, project) => ({
          ...acc,
          [project._id]: project.projectLeader?._id || "",
        }), {})
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await API.get("/auth/users");
    setUsers(res.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/projects", form);
      setForm({ name: "", description: "" });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to create project");
    }
  };

  const handleAddMember = async (projectId) => {
    try {
      await API.post(`/projects/${projectId}/members`, { userId: memberId });
      setShowMemberForm(null);
      setMemberId("");
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to add member");
    }
  };

  const handleAssignLeader = async (projectId) => {
    try {
      await API.patch(`/projects/${projectId}/leader`, { userId: leaderByProject[projectId] });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to update project leader");
    }
  };

  const getAvailableMembers = (project) => {
    const existingIds = new Set(project.members?.map((member) => member._id) || []);
    return users.filter((candidate) => candidate.role === "member" && !existingIds.has(candidate._id));
  };

  const getProjectMembers = (project) => {
    return project.members?.filter((member) => member.role === "member") || [];
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Projects</h1>
            <p style={styles.subtitle}>Manage your team projects</p>
          </div>
          {user?.role === "admin" && (
            <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
              + New Project
            </button>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>Create New Project</h3>
            <form onSubmit={handleCreate}>
              <input
                style={styles.input}
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                style={styles.input}
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div style={styles.formButtons}>
                <button style={styles.btn} type="submit">Create</button>
                <button style={styles.btnOutline} type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div style={styles.empty}>No projects yet. Create one to get started!</div>
        ) : (
          <div style={styles.grid}>
            {projects.map((project) => {
              const availableMembers = getAvailableMembers(project);
              const projectMembers = getProjectMembers(project);

              return (
                <div key={project._id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardIcon}>P</div>
                    <h3 style={styles.cardTitle}>{project.name}</h3>
                  </div>
                  <p style={styles.cardDesc}>{project.description || "No description"}</p>

                  <div style={styles.detailBlock}>
                    <span style={styles.label}>Project leader</span>
                    <strong style={styles.leaderName}>{project.projectLeader?.name || "Not assigned"}</strong>
                  </div>

                  <div style={styles.detailBlock}>
                    <span style={styles.label}>Members already added</span>
                    {projectMembers.length === 0 ? (
                      <p style={styles.noMembers}>No members added yet.</p>
                    ) : (
                      <div style={styles.memberList}>
                        {projectMembers.map((member) => (
                          <span key={member._id} style={styles.memberPill}>{member.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <span style={styles.memberCount}>
                      {projectMembers.length} member{projectMembers.length !== 1 ? "s" : ""}
                    </span>
                    <span style={styles.date}>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>

                  {user?.role === "admin" && (
                    <>
                      <div style={styles.leaderForm}>
                        <select
                          style={styles.input}
                          value={leaderByProject[project._id] || ""}
                          onChange={(e) => setLeaderByProject({ ...leaderByProject, [project._id]: e.target.value })}
                        >
                          <option value="">Select project leader</option>
                          {projectMembers.map((member) => (
                            <option key={member._id} value={member._id}>{member.name}</option>
                          ))}
                        </select>
                        <button
                          style={styles.addMemberBtn}
                          onClick={() => handleAssignLeader(project._id)}
                          disabled={!leaderByProject[project._id]}
                        >
                          Save Leader
                        </button>
                      </div>

                      <button
                        style={styles.addMemberBtn}
                        onClick={() => setShowMemberForm(showMemberForm === project._id ? null : project._id)}
                      >
                        + Add Member
                      </button>

                      {showMemberForm === project._id && (
                        <div style={styles.memberForm}>
                          <select
                            style={styles.input}
                            value={memberId}
                            onChange={(e) => setMemberId(e.target.value)}
                          >
                            <option value="">Select a member</option>
                            {availableMembers.map((candidate) => (
                              <option key={candidate._id} value={candidate._id}>{candidate.name}</option>
                            ))}
                          </select>
                          <button style={styles.btn} onClick={() => handleAddMember(project._id)} disabled={!memberId}>
                            Add
                          </button>
                          {availableMembers.length === 0 && (
                            <p style={styles.noMembers}>All members are already added.</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" },
  card: { background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  cardHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
  cardIcon: { width: "30px", height: "30px", borderRadius: "8px", background: "#f0f0ff", color: "#667eea", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" },
  cardTitle: { fontSize: "18px", fontWeight: "600", color: "#1a1a2e", margin: 0 },
  cardDesc: { color: "#888", fontSize: "14px", marginBottom: "16px" },
  detailBlock: { marginBottom: "14px" },
  label: { display: "block", fontSize: "12px", color: "#888", fontWeight: "700", marginBottom: "6px" },
  leaderName: { color: "#1a1a2e", fontSize: "14px" },
  memberList: { display: "flex", gap: "8px", flexWrap: "wrap" },
  memberPill: { background: "#f0f0ff", color: "#667eea", borderRadius: "999px", padding: "5px 10px", fontSize: "12px", fontWeight: "700" },
  noMembers: { color: "#aaa", fontSize: "13px", margin: 0 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  memberCount: { fontSize: "13px", color: "#667eea", fontWeight: "500" },
  date: { fontSize: "12px", color: "#aaa" },
  addMemberBtn: { width: "100%", padding: "8px", background: "#f0f0ff", color: "#667eea", border: "1px solid #667eea", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", marginBottom: "10px" },
  leaderForm: { marginTop: "12px" },
  memberForm: { marginTop: "12px" },
};
