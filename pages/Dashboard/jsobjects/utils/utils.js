export default {
  // Helper: always return tickets array from Apr1 query
  getTickets() {
    const raw = Tickets.data;

    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data; // Directus default: { data: [...] }

    return [];
  },

  // Main metrics used by the dashboard cards
  dashboardMetrics() {
    const tickets = this.getTickets();

    const totalTickets = tickets.length;

    const closedTickets = tickets.filter(t => t.status === "closed").length;
    const openTickets   = tickets.filter(t => t.status === "open").length;
    const inProgress    = tickets.filter(t => t.status === "in_progress").length;

    // priority values in schema are: low, Medium, High  -> normalize to lowercase
    const highPriority = tickets.filter(t =>
      String(t.priority || "").toLowerCase() === "high"
    ).length;
    const mediumPriority = tickets.filter(t =>
      String(t.priority || "").toLowerCase() === "medium"
    ).length;
    const lowPriority = tickets.filter(t =>
      String(t.priority || "").toLowerCase() === "low"
    ).length;

    return {
      totalTickets,
      closedTickets,
      openTickets,
      inProgress,
      highPriority,
      mediumPriority,
      lowPriority,
    };
  },

  // Optional: chart data by status (for the big chart widget)
  ticketStatusChartData() {
    const m = this.dashboardMetrics();
    return [
      { label: "Open",        value: m.openTickets },
      { label: "In Progress", value: m.inProgress },
      { label: "Closed",      value: m.closedTickets },
    ];
  },

  // Optional: chart data by priority (if you want a priority chart)
  ticketPriorityChartData() {
    const m = this.dashboardMetrics();
    return [
      { label: "High",   value: m.highPriority },
      { label: "Medium", value: m.mediumPriority },
      { label: "Low",    value: m.lowPriority },
    ];
  },
};
