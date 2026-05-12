import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/api';
import type { Department } from '../../types';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

export function HRDepartmentsContent() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchDepts(); }, []);

  async function fetchDepts() {
    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch {}
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createDepartment(form);
      setMsg('Department created.');
      setCreateModal(false);
      setForm({ name: '', description: '' });
      fetchDepts();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    try {
      await updateDepartment(editModal.id, form);
      setMsg('Department updated.');
      setEditModal(null);
      fetchDepts();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete department "${name}"? Employees will be unassigned.`)) return;
    try {
      await deleteDepartment(id);
      setMsg('Department deleted.');
      fetchDepts();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    }
  }

  function openEdit(dept: Department) {
    setForm({ name: dept.name, description: dept.description || '' });
    setEditModal(dept);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-app">Departments</h1>
          <button onClick={() => { setForm({ name: '', description: '' }); setCreateModal(true); }}
            className="flex items-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> New Department
          </button>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg} <button onClick={() => setMsg('')} className="ml-2">✕</button></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error} <button onClick={() => setError('')} className="ml-2">✕</button></div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.length === 0 ? (
              <p className="text-app-subtle col-span-3 text-center py-8">No departments yet</p>
            ) : departments.map(dept => (
              <div key={dept.id} className="bg-app-surface rounded-xl border border-app-border-subtle shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-app-accent">
                    <Building2 size={20} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(dept)}
                      className="p-1.5 text-app-subtle hover:text-app-accent hover:bg-blue-50 rounded">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(dept.id, dept.name)}
                      className="p-1.5 text-app-subtle hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-app">{dept.name}</h3>
                {dept.description && <p className="text-sm text-app-muted mt-1">{dept.description}</p>}
                <p className="text-xs text-app-subtle mt-3">{dept.member_count || 0} members</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {(createModal || editModal) && (
        <Modal title={editModal ? 'Edit Department' : 'New Department'} onClose={() => { setCreateModal(false); setEditModal(null); }} size="sm">
          <form onSubmit={editModal ? handleEdit : handleCreate} className="space-y-4">
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-app mb-1">Department Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-app mb-1">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>
            <button type="submit"
              className="w-full bg-app-accent hover:bg-app-accent-hover text-white py-2.5 rounded-lg text-sm font-medium">
              {editModal ? 'Save Changes' : 'Create Department'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function HRDepartmentsPage() {
  return (
    <Layout>
      <HRDepartmentsContent />
    </Layout>
  );
}
