export default {
  // priority dropdown options
  priorityOptions: [
    { label: "High",   value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low",    value: "low" },
  ],

  // status dropdown options
  statusOptions: [
    { label: "Open",         value: "open" },
    { label: "In Progress",  value: "in_progress" },
    { label: "Closed",       value: "closed" },
  ],

  // always read from the API query, NOT from the table
  getTickets() {
    const raw = tickets.data;          // <— your Directus tickets query
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    return [];
  },

  // main combined filter used by Table1
  filterTickets() {
    const data = this.getTickets();

    const selPriority = Priority_main.selectedOptionValue; // "high"/"medium"/"low" or empty
    const selStatus   = Status_main.selectedOptionValue;   // "open"/"in_progress"/"closed" or empty

    return data
      .filter(t => {
        const p = String(t.priority || "").toLowerCase();
        const s = t.status;

        const matchPriority = selPriority ? p === selPriority : true;
        const matchStatus   = selStatus   ? s === selStatus   : true;

        return matchPriority && matchStatus;
      })
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigned_to: t.assigned_to,
        description: t.description,
        tags: Array.isArray(t.tags) ? t.tags.map(tag => tag.name).join(", ") : "",
        updated_at: t.updated_at
      }));
  },
};
