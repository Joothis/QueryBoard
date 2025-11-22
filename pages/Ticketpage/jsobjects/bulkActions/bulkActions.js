export default {
  // ✅ Allowed domains for owner emails
  allowedDomains: ["company.com", "support.io"],

  // ---------- helpers ----------
  getSelectedTickets() {
    const rows = Table1.selectedRows || [];
    return Array.isArray(rows) ? rows : [];
  },

  _getDomainFromEmail(email) {
    if (!email || typeof email !== "string") return null;
    const parts = email.trim().split("@");
    if (parts.length !== 2) return null;
    return parts[1].toLowerCase();
  },

  isDomainAllowed(email) {
    const domain = this._getDomainFromEmail(email);
    if (!domain) return false;
    return this.allowedDomains.includes(domain);
  },

  // =========================================================
  // 3.1 BULK CLOSE
  // =========================================================
  async startBulkClose() {
    const selected = this.getSelectedTickets();
    if (!selected.length) {
      showAlert("Select at least one ticket to close.", "warning");
      return;
    }

    const hasHigh = selected.some(
      t => String(t.priority || "").toLowerCase() === "high"
    );

    // store selected ids for later
    const ids = selected.map(t => t.id);
    await storeValue("bulkClose_ticketIds", ids);

    if (hasHigh) {
      // need a reason -> open modal
      showModal("ModalCloseReason");
    } else {
      // no high-priority tickets -> close without reason
      await this.bulkCloseTickets("");
    }
  },

  // Called from modal confirm button
  async confirmBulkClose() {
    const reason = InputCloseReason.text || "";
    await this.bulkCloseTickets(reason);
    closeModal("ModalCloseReason");
  },

  // actual loop that PATCHes tickets + creates audit rows
  async bulkCloseTickets(reason) {
    const ids = (await getStoredValue("bulkClose_ticketIds")) || [];
    if (!ids.length) {
      showAlert("No tickets to close.", "error");
      return;
    }

    const selectedMap = (Table1.selectedRows || []).reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});

    const results = { success: [], failed: [] };

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const row = selectedMap[id] || {};

      try {
        // append reason to description if provided
        let newDescription = row.description || "";
        if (reason && reason.trim()) {
          const suffix = `\n\n[Closed reason]: ${reason.trim()}`;
          newDescription = (newDescription || "") + suffix;
        }

        const body = {
          status: "closed",
          description: newDescription,
          updated_at: new Date().toISOString()
        };

        // PATCH ticket
        await updateTicket.run({ id, body });

        // create audit
        const auditBody = {
          ticket_id: id,
          action: "bulk_close",
          by: appsmith.store.currentUserEmail || "operator@internal",
          at: new Date().toISOString(),
          detail: `Ticket closed via bulk action. Reason: ${reason || "N/A"}`
        };
        await createAudit.run({ body: auditBody });

        results.success.push(id);
      } catch (e) {
        results.failed.push({ id, error: e.message || String(e) });
      }
    }

    // refresh table query if you have one
    try { await tickets.run(); } catch (e) {}
    try { Table1.clearSelection(); } catch (e) {}

    showAlert(
      `Bulk close complete — success: ${results.success.length}, failed: ${results.failed.length}`,
      results.failed.length ? "warning" : "success"
    );

    return results;
  },

  // =========================================================
  // 3.2 BULK ASSIGN OWNER
  // =========================================================
  async startBulkAssignOwner() {
    const email = (InputAssignEmail.text || "").trim();
    const selected = this.getSelectedTickets();

    if (!email) {
      showAlert("Enter an owner email.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showAlert("Enter a valid email address.", "error");
      return;
    }

    if (!selected.length) {
      showAlert("Select at least one ticket to assign.", "warning");
      return;
    }

    const ids = selected.map(t => t.id);
    await storeValue("bulkAssign_ticketIds", ids);
    await storeValue("bulkAssign_email", email);

    if (!this.isDomainAllowed(email)) {
      // show confirmation modal if domain is not allowed
      showModal("ModalConfirmAssign");
      return;
    }

    // allowed domain -> go ahead
    await this.bulkAssignOwner(email, ids);
  },

  // Called from confirm button in ModalConfirmAssign
  async confirmBulkAssignOwner() {
    const email = await getStoredValue("bulkAssign_email");
    const ids = (await getStoredValue("bulkAssign_ticketIds")) || [];
    await this.bulkAssignOwner(email, ids);
    closeModal("ModalConfirmAssign");
  },

  async bulkAssignOwner(emailArg, idsArg) {
    const email = emailArg || (await getStoredValue("bulkAssign_email"));
    const ids = idsArg || (await getStoredValue("bulkAssign_ticketIds")) || [];

    if (!email || !ids.length) {
      showAlert("No tickets or email to assign.", "error");
      return;
    }

    const selectedMap = (Table1.selectedRows || []).reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});

    const results = { success: [], failed: [] };

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const row = selectedMap[id] || {};
      const previousOwner = row.assigned_to || null;

      try {
        const body = {
          assigned_to: email,
          updated_at: new Date().toISOString()
        };

        await updateTicket.run({ id, body });

        const auditBody = {
          ticket_id: id,
          action: "bulk_assign_owner",
          by: appsmith.store.currentUserEmail || "operator@internal",
          at: new Date().toISOString(),
          detail: `Owner changed from "${previousOwner}" to "${email}" via bulk assign.`
        };
        await createAudit.run({ body: auditBody });

        results.success.push(id);
      } catch (e) {
        results.failed.push({ id, error: e.message || String(e) });
      }
    }

    try { await tickets.run(); } catch (e) {}
    try { Table1.clearSelection(); } catch (e) {}

    showAlert(
      `Bulk assign complete — success: ${results.success.length}, failed: ${results.failed.length}`,
      results.failed.length ? "warning" : "success"
    );

    return results;
  }
};
