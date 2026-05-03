import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import API from "../api";
import Navbar from "../components/Navbar";

const columnTemplate = {
  "todo": { label: "To Do", color: "#b45309", bg: "#fff7ed", tasks: [] },
  "in-progress": { label: "In Progress", color: "#2563eb", bg: "#eff6ff", tasks: [] },
  "done": { label: "Done", color: "#15803d", bg: "#f0fdf4", tasks: [] },
};

const emptyForm = {
  mode: "manual",
  title: "",
  description: "",
  deadline: "",
  emailFrom: "",
  emailSubject: "",
};

const toDateKey = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const buildColumns = (tasks) => {
  const nextColumns = Object.fromEntries(
    Object.entries(columnTemplate).map(([key, column]) => [
      key,
      { ...column, tasks: [] },
    ])
  );

  tasks.forEach((task) => {
    if (nextColumns[task.status]) {
      nextColumns[task.status].tasks.push(task);
    }
  });

  return nextColumns;
};

export default function Kanban() {
  const [columns, setColumns] = useState(buildColumns([]));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [error, setError] = useState("");

  const allTasks = useMemo(
    () => Object.values(columns).flatMap((column) => column.tasks),
    [columns]
  );

  const tasksByDate = useMemo(() => {
    return allTasks.reduce((acc, task) => {
      const key = toDateKey(task.deadline);
      if (!key) return acc;
      acc[key] = [...(acc[key] || []), task];
      return acc;
    }, {});
  }, [allTasks]);

  const selectedTasks = tasksByDate[selectedDate] || [];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks?scope=personal");
      setColumns(buildColumns(res.data));
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to load your board");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    const isEmailTodo = form.mode === "email";
    const title = isEmailTodo
      ? form.title || form.emailSubject || "Follow up on email"
      : form.title;

    try {
      await API.post("/tasks", {
        title,
        description: form.description,
        deadline: form.deadline,
        taskType: "personal",
        source: isEmailTodo ? "email" : "manual",
        emailFrom: isEmailTodo ? form.emailFrom : "",
        emailSubject: isEmailTodo ? form.emailSubject : "",
      });
      setForm(emptyForm);
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to create todo");
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const sourceCol = { ...columns[source.droppableId], tasks: [...columns[source.droppableId].tasks] };
    const destCol = { ...columns[destination.droppableId], tasks: [...columns[destination.droppableId].tasks] };
    const [moved] = sourceCol.tasks.splice(source.index, 1);
    destCol.tasks.splice(destination.index, 0, { ...moved, status: destination.droppableId });

    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol,
    });

    try {
      await API.patch(`/tasks/${draggableId}/status`, { status: destination.droppableId });
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to update todo status");
      fetchTasks();
    }
  };

  const isOverdue = (deadline, status) => {
    return status !== "done" && deadline && new Date(deadline) < new Date();
  };

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const changeMonth = (offset) => {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1));
  };

  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Task Board</h1>
            <p style={styles.subtitle}>Create personal todos, schedule them, and move them as work changes.</p>
          </div>
          <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Close" : "+ Add Todo"}
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {showForm && (
          <section style={styles.formCard}>
            <div style={styles.modeRow}>
              <button
                type="button"
                style={form.mode === "manual" ? styles.modeActive : styles.modeBtn}
                onClick={() => setForm({ ...form, mode: "manual" })}
              >
                Todo
              </button>
              <button
                type="button"
                style={form.mode === "email" ? styles.modeActive : styles.modeBtn}
                onClick={() => setForm({ ...form, mode: "email" })}
              >
                Email todo
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {form.mode === "email" && (
                <div style={styles.formGrid}>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="Email from"
                    value={form.emailFrom}
                    onChange={(e) => setForm({ ...form, emailFrom: e.target.value })}
                  />
                  <input
                    style={styles.input}
                    placeholder="Email subject"
                    value={form.emailSubject}
                    onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                  />
                </div>
              )}

              <input
                style={styles.input}
                placeholder={form.mode === "email" ? "Todo title (optional)" : "Todo title"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required={form.mode === "manual"}
              />
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <input
                style={styles.input}
                type="date"
                value={form.deadline}
                onChange={(e) => {
                  setForm({ ...form, deadline: e.target.value });
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
              />
              <div style={styles.formButtons}>
                <button style={styles.btn} type="submit">Save Todo</button>
                <button style={styles.btnOutline} type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        <div style={styles.layout}>
          <section style={styles.boardPanel}>
            {loading ? (
              <div style={styles.loading}>Loading board...</div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <div style={styles.board}>
                  {Object.entries(columns).map(([colId, col]) => (
                    <div key={colId} style={styles.column}>
                      <div style={{ ...styles.columnHeader, borderTop: `4px solid ${col.color}` }}>
                        <span style={{ ...styles.columnTitle, color: col.color }}>{col.label}</span>
                        <span style={{ ...styles.columnCount, background: col.bg, color: col.color }}>
                          {col.tasks.length}
                        </span>
                      </div>

                      <Droppable droppableId={colId}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              ...styles.taskList,
                              background: snapshot.isDraggingOver ? col.bg : "transparent",
                            }}
                          >
                            {col.tasks.length === 0 && <div style={styles.emptyCol}>No todos here</div>}
                            {col.tasks.map((task, index) => (
                              <Draggable key={task._id} draggableId={task._id} index={index}>
                                {(provided, snapshot) => (
                                  <article
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...styles.taskCard,
                                      boxShadow: snapshot.isDragging
                                        ? "0 8px 24px rgba(15,23,42,0.16)"
                                        : "0 2px 8px rgba(15,23,42,0.06)",
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    <div style={styles.taskTopLine}>
                                      <h4 style={styles.taskTitle}>{task.title}</h4>
                                      {task.source === "email" && <span style={styles.emailBadge}>Email</span>}
                                    </div>
                                    {task.description && <p style={styles.taskDesc}>{task.description}</p>}
                                    <div style={styles.taskMeta}>
                                      {task.source === "email" && task.emailFrom && (
                                        <span style={styles.metaText}>From: {task.emailFrom}</span>
                                      )}
                                      {task.emailSubject && (
                                        <span style={styles.metaText}>Subject: {task.emailSubject}</span>
                                      )}
                                      {task.deadline && (
                                        <span
                                          style={{
                                            ...styles.deadlineTag,
                                            color: isOverdue(task.deadline, task.status) ? "#dc2626" : "#64748b",
                                          }}
                                        >
                                          {new Date(task.deadline).toLocaleDateString()}
                                          {isOverdue(task.deadline, task.status) && " overdue"}
                                        </span>
                                      )}
                                      <span style={styles.priorityTag}>Priority {task.priority || 3}/5</span>
                                    </div>
                                  </article>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </DragDropContext>
            )}
          </section>

          <aside style={styles.calendarPanel}>
            <div style={styles.calendarHeader}>
              <button style={styles.iconBtn} onClick={() => changeMonth(-1)} type="button">&lt;</button>
              <strong style={styles.monthLabel}>{monthLabel}</strong>
              <button style={styles.iconBtn} onClick={() => changeMonth(1)} type="button">&gt;</button>
            </div>
            <div style={styles.weekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day} style={styles.weekDay}>{day}</span>
              ))}
            </div>
            <div style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const hasTasks = Boolean(tasksByDate[key]?.length);
                const isSelected = key === selectedDate;
                const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();

                return (
                  <button
                    key={key}
                    type="button"
                    style={{
                      ...styles.dayCell,
                      ...(isSelected ? styles.daySelected : {}),
                      color: isCurrentMonth ? "#1e293b" : "#cbd5e1",
                    }}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span>{day.getDate()}</span>
                    {hasTasks && <span style={styles.dayDot}>{tasksByDate[key].length}</span>}
                  </button>
                );
              })}
            </div>

            <div style={styles.selectedDay}>
              <h2 style={styles.sideTitle}>
                {new Date(selectedDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              {selectedTasks.length === 0 ? (
                <p style={styles.emptyDay}>No todos scheduled.</p>
              ) : (
                selectedTasks.map((task) => (
                  <div key={task._id} style={styles.calendarTask}>
                    <strong>{task.title}</strong>
                    <span>{columnTemplate[task.status]?.label}</span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Segoe UI', sans-serif" },
  container: { maxWidth: "1360px", margin: "0 auto", padding: "32px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px" },
  title: { fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0 },
  subtitle: { color: "#64748b", fontSize: "15px", margin: "6px 0 0" },
  error: { background: "#fef2f2", color: "#b91c1c", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" },
  btn: { padding: "10px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "700" },
  btnOutline: { padding: "10px 18px", background: "#fff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "700" },
  formCard: { background: "#fff", borderRadius: "8px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(15,23,42,0.06)" },
  modeRow: { display: "inline-flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px", marginBottom: "16px" },
  modeBtn: { padding: "8px 14px", border: "none", background: "transparent", color: "#64748b", borderRadius: "6px", cursor: "pointer", fontWeight: "700" },
  modeActive: { padding: "8px 14px", border: "none", background: "#fff", color: "#1e293b", borderRadius: "6px", cursor: "pointer", fontWeight: "700", boxShadow: "0 1px 4px rgba(15,23,42,0.12)" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" },
  input: { width: "100%", padding: "11px 13px", borderRadius: "8px", border: "1px solid #dbe3ef", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box", outline: "none", background: "#fff" },
  textarea: { minHeight: "84px", resize: "vertical", fontFamily: "inherit" },
  formButtons: { display: "flex", gap: "10px", flexWrap: "wrap" },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: "20px", alignItems: "start" },
  boardPanel: { minWidth: 0 },
  loading: { textAlign: "center", color: "#64748b", padding: "60px", fontSize: "16px" },
  board: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" },
  column: { background: "#fff", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", minHeight: "520px" },
  columnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingTop: "12px" },
  columnTitle: { fontSize: "15px", fontWeight: "800" },
  columnCount: { padding: "2px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: "800" },
  taskList: { minHeight: "430px", borderRadius: "8px", padding: "4px", transition: "background 0.2s" },
  emptyCol: { textAlign: "center", color: "#94a3b8", fontSize: "14px", padding: "40px 0" },
  taskCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "12px", cursor: "grab" },
  taskTopLine: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" },
  taskTitle: { fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 6px", overflowWrap: "anywhere" },
  taskDesc: { fontSize: "13px", lineHeight: 1.45, color: "#64748b", margin: "0 0 10px", overflowWrap: "anywhere" },
  taskMeta: { display: "flex", flexDirection: "column", gap: "4px" },
  metaText: { fontSize: "12px", color: "#64748b", overflowWrap: "anywhere" },
  deadlineTag: { fontSize: "12px", fontWeight: "700" },
  priorityTag: { fontSize: "12px", fontWeight: "800", color: "#7c3aed" },
  emailBadge: { background: "#eef2ff", color: "#4338ca", borderRadius: "999px", padding: "2px 8px", fontSize: "11px", fontWeight: "800", whiteSpace: "nowrap" },
  calendarPanel: { background: "#fff", borderRadius: "8px", padding: "18px", boxShadow: "0 2px 12px rgba(15,23,42,0.06)" },
  calendarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  iconBtn: { width: "34px", height: "34px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "22px", lineHeight: "1" },
  monthLabel: { color: "#111827", fontSize: "16px" },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "6px" },
  weekDay: { textAlign: "center", color: "#64748b", fontSize: "12px", fontWeight: "800" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" },
  dayCell: { position: "relative", aspectRatio: "1", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "700" },
  daySelected: { borderColor: "#4f46e5", background: "#eef2ff" },
  dayDot: { position: "absolute", right: "4px", bottom: "4px", minWidth: "16px", height: "16px", borderRadius: "999px", background: "#4f46e5", color: "#fff", fontSize: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  selectedDay: { marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" },
  sideTitle: { fontSize: "15px", color: "#111827", margin: "0 0 10px" },
  emptyDay: { color: "#94a3b8", fontSize: "14px", margin: 0 },
  calendarTask: { display: "flex", justifyContent: "space-between", gap: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px", fontSize: "13px", color: "#334155" },
};
