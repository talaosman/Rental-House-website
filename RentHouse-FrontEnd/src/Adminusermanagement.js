import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUserManagement.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const RoleTag = ({ role }) => {
  const map = {
    ADMIN: { label: "Admin", cls: "role-admin" },
    USER: { label: "User", cls: "role-user" },
    HOUSE_OWNER: { label: "Owner", cls: "role-owner" },
  };
  const r = map[role] || { label: role, cls: "role-user" };
  return <span className={`role-tag ${r.cls}`}>{r.label}</span>;
};

const StatCard = ({ icon, value, label, accent }) => (
  <div className={`stat-card ${accent}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  </div>
);

const ConfirmModal = ({ user, onConfirm, onCancel, loading }) => (
  <div className="modal-backdrop" onClick={onCancel}>
    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
      <div className="confirm-icon">⚠️</div>
      <h3>Delete User</h3>
      <p>
        You are about to permanently delete{" "}
        <strong>{user?.username}</strong> ({user?.email}).
      </p>
      <p className="confirm-warning">
        This will also remove all their rents, favorites, visit requests,
        feedback, ratings, and offers. This action cannot be undone.
      </p>
      <div className="confirm-actions">
        <button className="btn-cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="btn-delete-confirm" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <><span className="btn-spin" /> Deleting…</>
          ) : (
            "Yes, Delete"
          )}
        </button>
      </div>
    </div>
  </div>
);

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "ADMIN") navigate("/");
  }, [navigate]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: localStorage.getItem("authHeader") || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      showToast("Failed to load users: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    let result = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          String(u.id).includes(q)
      );
    }
    if (roleFilter !== "ALL") result = result.filter((u) => u.role === roleFilter);
    result.sort((a, b) => {
      let va = a[sortBy] ?? "", vb = b[sortBy] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    setFiltered(result);
  }, [users, search, roleFilter, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${toDelete.id}/force-delete`, {
        method: "DELETE",
        headers: { Authorization: localStorage.getItem("authHeader") || "" },
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Delete failed");
      }
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
      showToast(`${toDelete.username} deleted successfully.`);
      setToDelete(null);
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    owners: users.filter((u) => u.role === "HOUSE_OWNER").length,
    regular: users.filter((u) => u.role === "USER").length,
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="sort-icon neutral">↕</span>;
    return <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const getAvatar = (u) =>
    u.profileImage && u.profileImage !== "null"
      ? u.profileImage.startsWith("http") || u.profileImage.startsWith("data:")
        ? u.profileImage
        : `data:image/jpeg;base64,${u.profileImage}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || "U")}&background=1e3a5f&color=7eb8f7&bold=true`;

  return (
    <div className="aumg-page">
      {toast && (
        <div className={`aumg-toast ${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="aumg-header">
        <div className="aumg-header-left">
          <button className="aumg-back" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="aumg-title">
              <span className="aumg-title-icon">👥</span> User Management
            </h1>
            <p className="aumg-subtitle">Manage all registered accounts across RentalHub</p>
          </div>
        </div>
        <div className="aumg-header-right">
          <span className="aumg-badge-live">
            <span className="live-dot" /> Live
          </span>
        </div>
      </div>

      <div className="aumg-stats">
        <StatCard icon="👤" value={stats.total} label="Total Users" accent="accent-blue" />
        <StatCard icon="🛡️" value={stats.admins} label="Admins" accent="accent-red" />
        <StatCard icon="🏠" value={stats.owners} label="Owners" accent="accent-green" />
        <StatCard icon="✨" value={stats.regular} label="Renters" accent="accent-purple" />
      </div>

      <div className="aumg-controls">
        <div className="aumg-search-wrap">
          <svg className="search-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="aumg-search"
            placeholder="Search by name, email or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>

        <div className="aumg-filters">
          {["ALL", "USER", "ADMIN", "HOUSE_OWNER"].map((r) => (
            <button
              key={r}
              className={`filter-pill ${roleFilter === r ? "active" : ""}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === "ALL" ? "All" : r === "HOUSE_OWNER" ? "Owners" : r === "USER" ? "Renters" : "Admins"}
            </button>
          ))}
        </div>

        <span className="aumg-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="aumg-table-wrap">
        {loading ? (
          <div className="aumg-loading">
            <div className="aumg-spinner" />
            <p>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="aumg-empty">
            <div className="aumg-empty-icon">🔍</div>
            <p>No users match your search.</p>
          </div>
        ) : (
          <table className="aumg-table">
            <thead>
              <tr>
                <th className="th-sortable" onClick={() => handleSort("id")}>ID <SortIcon col="id" /></th>
                <th>User</th>
                <th className="th-sortable" onClick={() => handleSort("email")}>Email <SortIcon col="email" /></th>
                <th className="th-sortable" onClick={() => handleSort("role")}>Role <SortIcon col="role" /></th>
                <th>Phone</th>
                <th>Notifications</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} className="aumg-row" style={{ animationDelay: `${i * 25}ms` }}>
                  <td className="td-id">#{user.id}</td>
                  <td className="td-user">
                    <img src={getAvatar(user)} alt={user.username} className="user-avatar" />
                    <span className="user-name">{user.username || "—"}</span>
                  </td>
                  <td className="td-email">{user.email}</td>
                  <td><RoleTag role={user.role} /></td>
                  <td className="td-phone">{user.phoneNumber || <span className="td-empty">—</span>}</td>
                  <td className="td-fcm">
                    {user.fcmToken
                      ? <span className="fcm-yes">✓ Registered</span>
                      : <span className="fcm-no">✕ None</span>}
                  </td>
                  <td>
                    {user.role !== "ADMIN" ? (
                      <button className="btn-delete" onClick={() => setToDelete(user)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                        </svg>
                        Delete
                      </button>
                    ) : (
                      <span className="btn-protected">🛡️ Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          user={toDelete}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setToDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
};

export default AdminUserManagement;