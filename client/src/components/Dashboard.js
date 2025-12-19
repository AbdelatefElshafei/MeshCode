'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, XCircle, FileText, Trophy, Flame, TrendingUp, Clock, Upload, Camera, X, LayoutDashboard, LogOut, Code } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const run = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) { window.location.href = '/login'; return; }
        const res = await fetch('http://localhost:3001/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          if (res.status === 401) { window.location.href = '/login'; return; }
          setError('Failed to load dashboard');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data.user || null);
        setProblems(Array.isArray(data.problems) ? data.problems : []);
        setLoading(false);
      } catch {
        setError('Server not reachable');
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const acceptedCount = problems.filter(p => p.latest_status === 'Accepted').length;
  const totalAttempted = problems.filter(p => p.latest_status).length;

  const handleFileSelect = async (file) => {
    try {
      setUploadError('');
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        setUploadError('Please upload an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Image must be 5MB or less');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          setPreviewUrl(reader.result);
          setUploading(true);
          const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
          const res = await fetch(`${API_BASE}/users/me/photo`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ dataUrl: reader.result })
          });
          const data = await res.json();
          
          if (!res.ok) {
            setUploadError(data?.error || 'Upload failed');
            setPreviewUrl(null);
            setUploading(false);
            return;
          }
          
          setUser(u => ({ ...(u || {}), photo_url: data.photo_url }));
          setUploading(false);
          setPreviewUrl(null);
        } catch (err) {
          setUploadError('Upload failed. Please try again.');
          setPreviewUrl(null);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadError('Error processing file');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <Image src="/Logo2.png" alt="MeshCode logo" width={80} height={42} style={{ borderRadius: '4px' }} />
            <div style={{ height: '24px', width: '1px', background: '#E5E7EB' }} />
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', margin: 0 }}>
              Dashboard
            </h1>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#6B7280',
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              transition: 'all 0.2s'
            }}>
              <Code size={16} />
              Problems
            </Link>

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
                      <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', color: '#1F2937', fontWeight: 600, fontSize: '14px', transition: 'background 0.2s' }}>
                        <Code size={16} color="#3B82F6" /> Problems
                      </Link>
                      <div style={{ height: '1px', background: '#E5E7EB', margin: '4px 0' }} />
                      <button onClick={() => { try { localStorage.removeItem('authToken'); } catch {}; window.location.href = '/login'; }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', color: '#1F2937', fontWeight: 600, fontSize: '14px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}>
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

      <div style={{ padding: '24px', display: 'flex', gap: '24px', minHeight: 'calc(100vh - 73px)' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 60, background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
            ))}
          </div>
        )}
        
        {error && (
          <div style={{ padding: '16px', borderRadius: '12px', background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', fontWeight: 600, width: '100%' }}>{error}</div>
        )}
        
        {!loading && !error && (
          <>
          {/* LEFT COLUMN - Profile Card */}
          <div style={{ width: '320px', flexShrink: 0 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  {/* Avatar Upload Section */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: 120, 
                      height: 120, 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      background: uploading ? '#F3F4F6' : '#DBEAFE',
                      border: '2px solid #E5E7EB',
                      position: 'relative'
                    }}>
                      {previewUrl || user?.photo_url ? (
                        <img 
                          src={previewUrl || user.photo_url} 
                          alt="avatar" 
                          style={{
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            opacity: uploading ? 0.5 : 1,
                            transition: 'opacity 0.3s'
                          }} 
                        />
                      ) : (
                        <div style={{
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: 36, 
                          fontWeight: 700, 
                          color: '#1E40AF'
                        }}>
                          {(user?.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      {uploading && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            border: '3px solid #E5E7EB',
                            borderTopColor: '#3B82F6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        background: '#3B82F6',
                        border: '2px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                        transition: 'transform 0.2s',
                        opacity: uploading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !uploading && (e.currentTarget.style.transform = 'scale(1.1)')}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Camera size={16} color="#FFFFFF" />
                    </button>
                  </div>

                  <input 
                    ref={fileRef} 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />

                  {/* User Info */}
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', marginBottom: '4px', wordBreak: 'break-word' }}>
                      {user?.email || 'User'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
                      Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  {uploadError && (
                    <div style={{ 
                      width: '100%',
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      background: '#FEE2E2', 
                      color: '#B91C1C', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <X size={14} />
                      {uploadError}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', background: '#FEF3C7', border: '1px solid #FCD34D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#78350F', fontWeight: 700, textTransform: 'uppercase' }}>Solved</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#92400E' }}>{acceptedCount}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '8px', background: '#DBEAFE', border: '1px solid #93C5FD', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#1E3A8A', fontWeight: 700, textTransform: 'uppercase' }}>Attempted</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1E40AF' }}>{totalAttempted}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Stats and Problems */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minWidth: 0 }}>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={24} color="#F59E0B" />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>{acceptedCount}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Solved</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} color="#3B82F6" />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>{totalAttempted}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Attempted</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame size={24} color="#EF4444" />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>0</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Day Streak</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '10px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} color="#10B981" />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>{totalAttempted > 0 ? Math.round((acceptedCount / totalAttempted) * 100) : 0}%</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Acceptance</div>
                  </div>
                </div>
              </div>
              </div>

              {/* Problems List */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <FileText size={20} color="#3B82F6" />
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Recent Problems</h2>
              </div>

              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px', gap: '16px', padding: '12px 16px', borderBottom: '2px solid #F3F4F6', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Title</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', textAlign: 'center' }}>Acceptance</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Difficulty</div>
              </div>

              {/* Problem Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {problems.map(p => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px', gap: '16px', padding: '14px 16px', background: '#F9FAFB', borderRadius: '8px', transition: 'all 0.2s', cursor: 'pointer', alignItems: 'center', border: '1px solid transparent' }}>
                    <div>
                      {p.latest_status === 'Accepted' ? (
                        <CheckCircle2 size={20} color="#10B981" />
                      ) : p.latest_status ? (
                        <XCircle size={20} color="#EF4444" />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #D1D5DB' }}></div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>{p.id}. {p.title}</span>
                      </div>
                      {p.description && (
                        <span style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>
                      {p.acceptance_rate ? `${p.acceptance_rate}%` : 'N/A'}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        background: p.difficulty === 'Hard' ? '#FEE2E2' : p.difficulty === 'Medium' ? '#FEF3C7' : '#D1FAE5',
                        color: p.difficulty === 'Hard' ? '#DC2626' : p.difficulty === 'Medium' ? '#D97706' : '#059669',
                        border: `1px solid ${p.difficulty === 'Hard' ? '#FCA5A5' : p.difficulty === 'Medium' ? '#FCD34D' : '#6EE7B7'}`
                      }}>
                        {p.difficulty || 'Easy'}
                      </span>
                    </div>
                  </div>
                ))}
                {problems.length === 0 && (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280', fontSize: '14px', fontWeight: 600 }}>
                    No problems found. Start solving to see your progress!
                  </div>
                )}
              </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}