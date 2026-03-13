import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword, getDepartments, updateLeaveBalance, getLeavePolicy } from '../../services/api';
import type { User, Department } from '../../types';
import { Plus, Search, Pencil, KeyRound, Heart, Trash2 } from 'lucide-react';

export function HREmployeesContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<User | null>(null);
  const [pwModal, setPwModal] = useState<User | null>(null);
  const [leaveModal, setLeaveModal] = useState<User | null>(null);
  const [applicableLeaveTypes, setApplicableLeaveTypes] = useState<{ leave_type: string; default_days: number }[]>([]);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department_id: '', gender: 'other' });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', department_id: '', is_active: true, gender: 'other' });
  const [newPassword, setNewPassword] = useState('');
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'paid', days_allocated: 0, days_used: 0 });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        getUsers({ search: search || undefined, role: roleFilter || undefined }),
        getDepartments(),
      ]);
      setUsers(u);
      setDepartments(d);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createUser({ ...form, department_id: form.department_id || null });
      setMsg('Employee created successfully.');
      setCreateModal(false);
      setForm({ name: '', email: '', password: '', role: 'employee', department_id: '', gender: 'other' });
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create user.');
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    try {
      await updateUser(editModal.id, { ...editForm, department_id: editForm.department_id || null });
      setMsg('Employee updated.');
      setEditModal(null);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to update.');
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwModal) return;
    try {
      await resetUserPassword(pwModal.id, newPassword);
      setMsg('Password reset successfully.');
      setPwModal(null);
      setNewPassword('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleLeaveUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveModal) return;
    try {
      await updateLeaveBalance(leaveModal.id, {
        leave_type:     leaveForm.leave_type,
        days_allocated: leaveForm.days_allocated,
        days_used:      leaveForm.days_used,
      });
      setMsg('Leave balance updated.');
      setLeaveModal(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  function openEdit(user: User) {
    setEditForm({ name: user.name, email: user.email, role: user.role, department_id: String(user.department_id || ''), is_active: true, gender: user.gender || 'other' });
    setEditModal(user);
  }

  async function openLeaveModal(user: User) {
    setLeaveModal(user);
    setLeaveForm({ leave_type: '', days_allocated: 0, days_used: 0 });
    try {
      const policies = await getLeavePolicy();
      const gender = user.gender || 'other';
      const applicable = policies.filter((p: { leave_type: string; gender_applicable: string }) => {
        const ga = p.gender_applicable;
        return ga === 'all' || (ga === 'female' && gender === 'female') || (ga === 'male' && gender === 'male');
      }).map((p: { leave_type: string; default_days: number }) => ({ leave_type: p.leave_type, default_days: p.default_days }));
      setApplicableLeaveTypes(applicable);
      if (applicable.length > 0) {
        setLeaveForm({ leave_type: applicable[0].leave_type, days_allocated: applicable[0].default_days, days_used: 0 });
      }
    } catch {
      setApplicableLeaveTypes([]);
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`Are you sure you want to delete "${user.name}"? Their account will be deactivated and they will no longer be able to log in.`)) return;
    try {
      await deleteUser(user.id);
      setMsg(`"${user.name}" has been deleted.`);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to delete user.');
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Employee
          </button>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2">✕</button></div>}

        {/* Search & Filter */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">All Roles</option>
            <option value="employee">Employee</option>
            <option value="supervisor">Supervisor</option>
            <option value="hr">HR</option>
          </select>
          <button onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Search
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'hr' ? 'purple' : u.role === 'supervisor' ? 'info' : 'neutral'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{(u as any).department_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(u)} title="Edit"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setPwModal(u)} title="Reset Password"
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded">
                            <KeyRound size={15} />
                          </button>
                          <button onClick={() => openLeaveModal(u)} title="Edit Leave"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                            <Heart size={15} />
                          </button>
                          <button onClick={() => handleDelete(u)} title="Delete User"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-center text-gray-400 py-8">No employees found</p>}
            </div>
          )}
        </div>
      {/* Create Modal */}
      {createModal && (
        <Modal title="Add New Employee" onClose={() => setCreateModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="hr">HR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="other">Other / Unspecified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="">No Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Gender determines which leave types are seeded (maternity/paternity).</p>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Create Employee
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editModal && (
        <Modal title={`Edit: ${editModal.name}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="hr">HR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select value={editForm.department_id} onChange={e => setEditForm({ ...editForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="">No Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
                  <option value="other">Other / Unspecified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={editForm.is_active}
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active Account</label>
              </div>
            </div>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Save Changes
            </button>
          </form>
        </Modal>
      )}

      {/* Password Reset Modal */}
      {pwModal && (
        <Modal title={`Reset Password: ${pwModal.name}`} onClose={() => setPwModal(null)} size="sm">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Reset Password
            </button>
          </form>
        </Modal>
      )}

      {/* Leave Balance Modal */}
      {leaveModal && (
        <Modal title={`Leave Balance: ${leaveModal.name}`} onClose={() => setLeaveModal(null)} size="sm">
          <form onSubmit={handleLeaveUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                value={leaveForm.leave_type}
                onChange={e => {
                  const sel = applicableLeaveTypes.find(t => t.leave_type === e.target.value);
                  setLeaveForm({ ...leaveForm, leave_type: e.target.value, days_allocated: sel?.default_days ?? leaveForm.days_allocated });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select leave type…</option>
                {applicableLeaveTypes.map(t => (
                  <option key={t.leave_type} value={t.leave_type}>
                    {t.leave_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} (default: {t.default_days} days)
                  </option>
                ))}
              </select>
              {applicableLeaveTypes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No leave types apply to this employee&apos;s gender.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Allocated</label>
                <input type="number" value={leaveForm.days_allocated}
                  onChange={e => setLeaveForm({ ...leaveForm, days_allocated: Number(e.target.value) })}
                  min={0} step={0.5} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Used</label>
                <input type="number" value={leaveForm.days_used}
                  onChange={e => setLeaveForm({ ...leaveForm, days_used: Number(e.target.value) })}
                  min={0} step={0.5} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Remaining = Allocated − Used = <strong>{Math.max(0, leaveForm.days_allocated - leaveForm.days_used)}</strong> days
            </p>
            <button type="submit"
              disabled={!leaveForm.leave_type}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium">
              Update Balance
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function HREmployeesPage() {
  return (
    <Layout>
      <HREmployeesContent />
    </Layout>
  );
}
