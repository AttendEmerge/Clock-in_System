import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import { getLeavePolicy, createLeavePolicyType, updateLeavePolicy, deleteLeavePolicyType } from '../../services/api';
import { Plus, Save, Trash2, Pencil } from 'lucide-react';

interface Policy {
  leave_type: string;
  default_days: number;
  gender_applicable: 'all' | 'male' | 'female';
}

function formatLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const GENDER_LABELS: Record<string, string> = { all: 'All', male: 'Male only', female: 'Female only' };

export function HRLeavePolicyContent() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');
  const [error, setError]       = useState('');

  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ leave_type: '', default_days: 0, gender_applicable: 'all' });

  const [editType, setEditType]     = useState<string | null>(null);
  const [editForm, setEditForm]     = useState({ default_days: 0, gender_applicable: 'all' });
  const [saving, setSaving]         = useState<string | null>(null);

  useEffect(() => { fetchPolicies(); }, []);

  async function fetchPolicies() {
    setLoading(true);
    try {
      const data = await getLeavePolicy();
      setPolicies(data);
    } catch {}
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createLeavePolicyType({
        leave_type: addForm.leave_type,
        default_days: addForm.default_days,
        gender_applicable: addForm.gender_applicable,
      });
      setMsg(`Leave type "${addForm.leave_type}" created.`);
      setShowAdd(false);
      setAddForm({ leave_type: '', default_days: 0, gender_applicable: 'all' });
      fetchPolicies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create leave type.');
    }
  }

  async function handleSave(type: string) {
    setSaving(type);
    setError('');
    try {
      await updateLeavePolicy(type, editForm);
      setMsg(`${formatLabel(type)} updated.`);
      setEditType(null);
      fetchPolicies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Save failed.');
    }
    setSaving(null);
  }

  async function handleDelete(type: string) {
    if (!window.confirm(`Delete "${formatLabel(type)}" leave type? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteLeavePolicyType(type);
      setMsg(`${formatLabel(type)} deleted.`);
      fetchPolicies();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Delete failed.');
    }
  }

  function openEdit(p: Policy) {
    setEditType(p.leave_type);
    setEditForm({ default_days: p.default_days, gender_applicable: p.gender_applicable });
  }

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app">Leave Policy</h1>
            <p className="text-sm text-app-muted mt-0.5">
              Manage company-wide leave types and their default allocations. Changes apply to new employees automatically.
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setError(''); }}
            className="flex items-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Add Leave Type
          </button>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2 font-bold">x</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2 font-bold">x</button></div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" />
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle p-8 text-center text-app-subtle text-sm">
            No leave types configured yet. Click <strong>Add Leave Type</strong> to get started.
          </div>
        ) : (
          <div className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-page border-b border-app-border-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Leave Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Default Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Applies To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-app-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border-subtle">
                {policies.map(p => {
                  const isEditing = editType === p.leave_type;
                  return (
                    <tr key={p.leave_type} className="hover:bg-app-page">
                      <td className="px-4 py-3 font-medium text-app">{formatLabel(p.leave_type)}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.default_days}
                            onChange={e => setEditForm({ ...editForm, default_days: Math.floor(Number(e.target.value)) })}
                            min={0}
                            step={1}
                            className="w-20 px-2 py-1 border border-app-input-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
                          />
                        ) : (
                          <span>{p.default_days} days</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-app-muted">
                        {isEditing ? (
                          <select
                            value={editForm.gender_applicable}
                            onChange={e => setEditForm({ ...editForm, gender_applicable: e.target.value })}
                            className="px-2 py-1 border border-app-input-border rounded text-sm focus:outline-none"
                          >
                            <option value="all">All</option>
                            <option value="male">Male only</option>
                            <option value="female">Female only</option>
                          </select>
                        ) : (
                          GENDER_LABELS[p.gender_applicable] || 'All'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(p.leave_type)}
                                disabled={saving === p.leave_type}
                                className="flex items-center gap-1 px-3 py-1.5 bg-app-accent hover:bg-app-accent-hover text-white rounded text-xs font-medium disabled:opacity-50"
                              >
                                <Save size={13} /> {saving === p.leave_type ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditType(null)}
                                className="px-3 py-1.5 border border-app-input-border text-app-muted hover:bg-app-page rounded text-xs"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => openEdit(p)} title="Edit"
                                className="p-1.5 text-app-subtle hover:text-app-accent hover:bg-blue-50 rounded">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => handleDelete(p.leave_type)} title="Delete"
                                className="p-1.5 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded">
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>Note:</strong> Changing defaults affects <em>new</em> employee accounts.
          To update existing employees, use the <strong>Edit Leave</strong> button on the Employees page.
          Adding a new leave type will automatically appear in employees' leave balances next time they load their dashboard.
        </div>
      </div>

      {/* Add Leave Type Modal */}
      {showAdd && (
        <Modal title="Add Leave Type" onClose={() => setShowAdd(false)} size="sm">
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-app mb-1">Leave Type Name</label>
              <input
                value={addForm.leave_type}
                onChange={e => setAddForm({ ...addForm, leave_type: e.target.value })}
                required
                placeholder="e.g. compassionate, study, unpaid..."
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
              <p className="text-xs text-app-subtle mt-1">Will be stored as lowercase with underscores (e.g. "study_leave")</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Default Days</label>
              <input
                type="number"
                value={addForm.default_days}
                onChange={e => setAddForm({ ...addForm, default_days: Math.floor(Number(e.target.value)) })}
                min={0}
                step={1}
                required
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Applies To</label>
              <select
                value={addForm.gender_applicable}
                onChange={e => setAddForm({ ...addForm, gender_applicable: e.target.value })}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none"
              >
                <option value="all">All employees</option>
                <option value="male">Male employees only</option>
                <option value="female">Female employees only</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-app-accent hover:bg-app-accent-hover text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Create Leave Type
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function HRLeavePolicyPage() {
  return (
    <Layout>
      <HRLeavePolicyContent />
    </Layout>
  );
}
