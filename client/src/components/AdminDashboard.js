'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, Shield, LogOut, Plus, Trash2, Save, FileText, Server, RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [creating, setCreating] = useState({ title: '', description: '', gradient: '', starter_code: '' });
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState({ title: '', description: '', gradient: '', starter_code: '' });
  const [testcasesText, setTestcasesText] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) { if (typeof window !== 'undefined') window.location.href = '/login'; return; }
    const load = async () => {
      try {
        const dres = await fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        if (!dres.ok) { setError('Unauthorized'); setLoading(false); return; }
        const d = await dres.json();
        setUser(d.user || null);
        const pres = await fetch(`${API_BASE}/problems`);
        const plist = await pres.json();
        setProblems(Array.isArray(plist.problems) ? plist.problems : []);
        const sres = await fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
        if (sres.ok) { setStats(await sres.json()); }
        setLoading(false);
      } catch {
        setError('Server not reachable');
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refreshProblems = async () => {
    try {
      const res = await fetch('http://localhost:3001/problems');
      const data = await res.json();
      setProblems(Array.isArray(data.problems) ? data.problems : []);
    } catch {}
  };

  const createProblem = async () => {
    setActionMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`${API_BASE}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(creating)
      });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data?.error || 'Create failed'); return; }
      setCreating({ title: '', description: '', gradient: '', starter_code: '' });
      setActionMsg('Created');
      refreshProblems();
    } catch {
      setActionMsg('Create failed');
    }
  };

  const startEdit = (p) => {
    setSelected(p);
    setEditing({ title: p.title || '', description: p.description || '', gradient: p.gradient || '', starter_code: p.starter_code || '' });
  };

  const saveEdit = async () => {
    if (!selected) return;
    setActionMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`http://localhost:3001/problems/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editing)
      });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data?.error || 'Update failed'); return; }
      setActionMsg('Updated');
      setSelected(null);
      refreshProblems();
    } catch {
      setActionMsg('Update failed');
    }
  };

  const deleteProblem = async (p) => {
    setActionMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`http://localhost:3001/problems/${p.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data?.error || 'Delete failed'); return; }
      setActionMsg('Deleted');
      refreshProblems();
    } catch {
      setActionMsg('Delete failed');
    }
  };

  const addTestCases = async () => {
    if (!selected) return;
    setActionMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const payload = JSON.parse(testcasesText);
      const res = await fetch(`http://localhost:3001/problems/${selected.id}/testcases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cases: Array.isArray(payload) ? payload : [] })
      });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data?.error || 'Add testcases failed'); return; }
      setActionMsg('Testcases added');
      setTestcasesText('');
    } catch {
      setActionMsg('Invalid testcases');
    }
  };

  const clearTestCases = async () => {
    if (!selected) return;
    setActionMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`http://localhost:3001/problems/${selected.id}/testcases`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data?.error || 'Delete testcases failed'); return; }
      setActionMsg('Testcases cleared');
    } catch {
      setActionMsg('Delete testcases failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <Image src="/Logo2.png" alt="MeshCode logo" width={80} height={42} style={{ borderRadius: '4px' }} />
            <div style={{ height: '24px', width: '1px', background: '#E5E7EB' }} />
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Admin</h1>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            {user && (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(v => !v)} style={{display: 'flex', alignItems: 'center', gap: '10px', background: '#F3F4F6', padding: '6px 12px 6px 6px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer'}}>
                  <div style={{width: 28, height: 28, borderRadius: '6px', overflow: 'hidden', background: '#DBEAFE'}}>
                    {user.photo_url ? (
                      <img src={user.photo_url} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    ) : (
                      <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1E40AF'}}>{(user.email || '?')[0].toUpperCase()}</div>
                    )}
                  </div>
                  <span style={{fontSize: 13, fontWeight: 600, color: '#1F2937'}}>{user.email}</span>
                </button>
                {menuOpen && (
                  <>
                    <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 999 }} />
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', minWidth: 200, overflow: 'hidden', zIndex: 1000 }}>
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', color: '#1F2937', fontWeight: 600, fontSize: '14px', transition: 'background 0.2s' }}>
                        <LayoutDashboard size={16} color="#3B82F6" /> Dashboard
                      </Link>
                      <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', color: '#1F2937', fontWeight: 600, fontSize: '14px', transition: 'background 0.2s' }}>
                        <Shield size={16} color="#3B82F6" /> Admin
                      </Link>
                      <div style={{ height: '1px', background: '#E5E7EB', margin: '4px 0' }} />
                      <button onClick={() => { try { localStorage.removeItem('authToken'); } catch {}; if (typeof window !== 'undefined') window.location.href = '/login'; }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', color: '#1F2937', fontWeight: 600, fontSize: '14px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}>
                        <LogOut size={16} color="#EF4444" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 60, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', borderRadius: '12px', background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', fontWeight: 600 }}>{error}</div>
        )}

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Server size={18} color="#3B82F6" />
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>System Status</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ padding: 12, border: '1px solid #E5E7EB', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Problems</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>{stats ? stats.problems : '—'}</div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid #E5E7EB', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Submissions</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>{stats ? stats.submissions : '—'}</div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid #E5E7EB', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Workers</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>{stats ? stats.workers : '—'}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Plus size={18} color="#3B82F6" />
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>Create Problem</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value })} placeholder="Title" style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <textarea value={creating.description} onChange={(e) => setCreating({ ...creating, description: e.target.value })} placeholder="Description" rows={3} style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <input value={creating.gradient} onChange={(e) => setCreating({ ...creating, gradient: e.target.value })} placeholder="Gradient CSS" style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <textarea value={creating.starter_code} onChange={(e) => setCreating({ ...creating, starter_code: e.target.value })} placeholder="Starter code" rows={6} style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', fontFamily: 'monospace' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={createProblem} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#3B82F6', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Create</button>
                    <button onClick={refreshProblems} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#1F2937', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={16} /> Refresh</button>
                  </div>
                  {actionMsg && <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>{actionMsg}</div>}
                </div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText size={18} color="#3B82F6" />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>Problems</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px', gap: 12, padding: '12px 16px', borderBottom: '2px solid #F3F4F6', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>ID</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Title</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' }}>Actions</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' }}>Manage</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {problems.map(p => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 120px', gap: 12, padding: '12px 16px', background: '#F9FAFB', borderRadius: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{p.id}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{p.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                      <button onClick={() => startEdit(p)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#3B82F6', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}><Save size={14} /> Edit</button>
                      <button onClick={() => deleteProblem(p)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEE2E2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}><Trash2 size={14} /> Delete</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button onClick={() => setSelected(p)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #93C5FD', background: '#DBEAFE', color: '#1E3A8A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Select</button>
                    </div>
                  </div>
                ))}
              </div>

              {selected && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>Editing #{selected.id}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title" style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                      <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={3} style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                      <input value={editing.gradient} onChange={(e) => setEditing({ ...editing, gradient: e.target.value })} placeholder="Gradient CSS" style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                      <textarea value={editing.starter_code} onChange={(e) => setEditing({ ...editing, starter_code: e.target.value })} placeholder="Starter code" rows={6} style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', fontFamily: 'monospace' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveEdit} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#3B82F6', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setSelected(null)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#1F2937', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea value={testcasesText} onChange={(e) => setTestcasesText(e.target.value)} placeholder='Testcases JSON array, e.g. [{"input":[1,2],"expected":3}]' rows={8} style={{ padding: 10, borderRadius: 8, border: '1px solid #E5E7EB', fontFamily: 'monospace' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={addTestCases} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#10B981', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Add Testcases</button>
                        <button onClick={clearTestCases} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEE2E2', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}>Clear Testcases</button>
                      </div>
                    </div>
                  </div>
                  {actionMsg && <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 700, marginTop: 8 }}>{actionMsg}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
