'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    Zap, 
    FileText, 
    MessageSquare, 
    CheckCircle2, 
    XCircle, 
    Cpu,
    Lock,
    User,
    LogOut,
    ChevronRight,
    Activity
} from 'lucide-react';

const INITIAL_STATE = {};

export default function DistributedPlatform() {
  const router = useRouter();
  const [activeId, setActiveId] = useState(null);
  const [activeView, setActiveView] = useState('code');
  const [problemsData, setProblemsData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [encType, setEncType] = useState('AES');
  const [workersCount, setWorkersCount] = useState(4);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const editorRef = useRef(null);
  const [user, setUser] = useState(null);
  const [recentProblems, setRecentProblems] = useState([]);
  const [wbPos, setWbPos] = useState({ x: 40, y: 40, w: 320, h: 220 });
  const [wbDragging, setWbDragging] = useState(false);
  const [wbResizing, setWbResizing] = useState(false);
  const [wbDrawing, setWbDrawing] = useState(false);
  const [wbBrushColor, setWbBrushColor] = useState('#111827');
  const [wbBrushSize, setWbBrushSize] = useState(2);
  const wbCanvasRef = useRef(null);
  const wbContainerRef = useRef(null);
  const wbDragOffsetRef = useRef({ dx: 0, dy: 0 });
  const wbResizeStartRef = useRef({ sx: 0, sy: 0, sw: 0, sh: 0 });
  const wbLastPointRef = useRef(null);
  const wbImageRef = useRef(null);
  const wbResizingRef = useRef(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const handleLogout = () => {
    try { localStorage.removeItem('authToken'); } catch {}
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  const updateProblemData = (field, value) => {
    setProblemsData(prev => ({
        ...prev,
        [activeId]: {
            ...prev[activeId],
            [field]: value
        }
    }));
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
      editorRef.current.setScrollTop(0);
    }
  }, [activeId, activeView]);

  useEffect(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        router.replace('/login');
        return;
      }
      setAuthChecked(true);
    } catch {
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await fetch('http://localhost:3001/workers/count');
        const data = await res.json();
        if (typeof data.count === 'number') setWorkersCount(data.count);
      } catch {}
    };
    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await fetch('http://localhost:3001/problems');
        const data = await res.json();
        if (Array.isArray(data.problems)) {
          const normalized = {};
          data.problems.forEach(p => {
            normalized[p.id] = {
              id: p.id,
              title: p.title,
              desc: p.description || '',
              code: p.starter_code || '',
              notes: '',
              output: null,
              difficulty: p.difficulty || 'Easy'
            };
          });
          setProblemsData(normalized);
          if (data.problems.length > 0) setActiveId(data.problems[0].id);
        }
      } catch {}
    };
    fetchProblems();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) return;
        const res = await fetch('http://localhost:3001/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data?.user) setUser(data.user);
        if (Array.isArray(data?.problems)) setRecentProblems(data.problems);
      } catch {}
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    const fetchUserPhoto = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) return;
        if (user && user.photo_url) return;
        const res = await fetch('http://localhost:3001/users/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data?.user) setUser(data.user);
      } catch {}
    };
    fetchUserPhoto();
  }, [user]);

  

  const handleSubmit = async () => {
    setLoading(true);
    updateProblemData('output', null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch('http://localhost:3001/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          questionId: activeId,
          userCode: problemsData[activeId].code,
          encryptionType: encType
        })
      });
      
      const data = await res.json();
      
      setTimeout(() => {
          updateProblemData('output', data);
          setLoading(false);
      }, 600);
    } catch (err) {
      alert("Backend error. Is server running?");
      setLoading(false);
    }
  };

  const currentProblem = activeId ? problemsData[activeId] : { title: '', desc: '', code: '', notes: '', output: null, difficulty: 'Easy' };

  const onWbHeaderMouseDown = (e) => {
    setWbDragging(true);
    const rect = wbContainerRef.current.getBoundingClientRect();
    wbDragOffsetRef.current = { dx: e.clientX - rect.left - wbPos.x, dy: e.clientY - rect.top - wbPos.y };
  };
  const onWbResizeMouseDown = (e) => {
    setWbResizing(true);
    wbResizingRef.current = true;
    wbImageRef.current = wbCanvasRef.current ? wbCanvasRef.current.toDataURL() : null;
    wbResizeStartRef.current = { sx: e.clientX, sy: e.clientY, sw: wbPos.w, sh: wbPos.h };
  };
  const onWbCanvasMouseDown = (e) => {
    setWbDrawing(true);
    const rect = wbCanvasRef.current.getBoundingClientRect();
    wbLastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onGlobalMouseMove = (e) => {
    if (wbDragging && wbContainerRef.current) {
      const rect = wbContainerRef.current.getBoundingClientRect();
      const nx = e.clientX - rect.left - wbDragOffsetRef.current.dx;
      const ny = e.clientY - rect.top - wbDragOffsetRef.current.dy;
      const maxX = rect.width - wbPos.w;
      const maxY = rect.height - wbPos.h;
      setWbPos(p => ({ ...p, x: Math.max(0, Math.min(nx, maxX)), y: Math.max(0, Math.min(ny, maxY)) }));
    }
    if (wbResizing && wbContainerRef.current) {
      const dx = e.clientX - wbResizeStartRef.current.sx;
      const dy = e.clientY - wbResizeStartRef.current.sy;
      const nw = Math.max(160, wbResizeStartRef.current.sw + dx);
      const nh = Math.max(120, wbResizeStartRef.current.sh + dy);
      const rect = wbContainerRef.current.getBoundingClientRect();
      const maxW = rect.width - wbPos.x;
      const maxH = rect.height - wbPos.y;
      setWbPos(p => ({ ...p, w: Math.min(nw, maxW), h: Math.min(nh, maxH) }));
    }
    if (wbDrawing && wbCanvasRef.current) {
      const rect = wbCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const last = wbLastPointRef.current;
      const ctx = wbCanvasRef.current.getContext('2d');
      ctx.strokeStyle = wbBrushColor;
      ctx.lineWidth = wbBrushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      wbLastPointRef.current = { x, y };
    }
  };
  const onGlobalMouseUp = () => {
    if (wbDragging) setWbDragging(false);
    if (wbResizing) { setWbResizing(false); wbResizingRef.current = false; }
    if (wbDrawing) { setWbDrawing(false); wbLastPointRef.current = null; }
  };
  useEffect(() => {
    const mm = (e) => onGlobalMouseMove(e);
    const mu = () => onGlobalMouseUp();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
  }, [wbDragging, wbResizing, wbDrawing, wbBrushColor, wbBrushSize, wbPos.x, wbPos.y]);
  useEffect(() => {
    if (wbResizingRef.current && wbImageRef.current && wbCanvasRef.current) {
      const canvas = wbCanvasRef.current;
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = wbImageRef.current;
    }
  }, [wbPos.w, wbPos.h]);

  const getDifficultyColor = (diff) => {
    if (diff === 'Hard') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.3)' };
    if (diff === 'Medium') return { bg: 'rgba(251, 191, 36, 0.15)', text: '#D97706', border: 'rgba(251, 191, 36, 0.3)' };
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#059669', border: 'rgba(34, 197, 94, 0.3)' };
  };

  if (!authChecked) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* HEADER */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
          <img src="/Logo2.png" alt="MeshCode" width={80} height={42} style={{ borderRadius: '4px' }} />
          <div style={{ height: '24px', width: '1px', background: '#E5E7EB' }} />
          <a href="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#6B7280',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}>
            <User size={16} />
            Dashboard
          </a>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          {user && (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', background: '#F3F4F6', padding: '6px 12px 6px 6px', borderRadius: '8px', border: '1px solid #E5E7EB'}}>
              <div style={{width: 28, height: 28, borderRadius: '6px', overflow: 'hidden', background: '#DBEAFE'}}>
                {user.photo_url ? (
                  <img src={user.photo_url} alt="avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1E40AF'}}>{(user.email || '?')[0].toUpperCase()}</div>
                )}
              </div>
              <span style={{fontSize: 13, fontWeight: 600, color: '#1F2937'}}>{user.email}</span>
            </div>
          )}
          
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            padding: '8px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#1F2937'
          }}>
            <Lock size={14} style={{color: '#3B82F6'}}/>
            <select 
              value={encType} 
              onChange={(e) => setEncType(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#1F2937',
                fontSize: '13px'
              }}
            >
              <option value="AES">AES-256</option>
            </select>
          </div>

          <motion.button 
            onClick={handleSubmit}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#D1D5DB' : '#10B981',
              color: '#FFFFFF',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 1px 3px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? <Cpu size={16} style={{animation: 'spin 1s linear infinite'}}/> : <Play size={16} />}
            <span>{loading ? 'Running...' : 'Run Code'}</span>
          </motion.button>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#1F2937',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* LEFT SIDEBAR - Problem List */}
        <div style={{
          width: '280px',
          background: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Problem List
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {Object.values(problemsData).map((prob) => {
              const colors = getDifficultyColor(prob.difficulty);
              return (
                <motion.button
                  key={prob.id}
                  onClick={() => setActiveId(prob.id)}
                  whileHover={{ x: 2 }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeId === prob.id ? '#EFF6FF' : 'transparent',
                    color: activeId === prob.id ? '#1E40AF' : '#4B5563',
                    marginBottom: '4px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontWeight: '600',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {prob.id}. {prob.title}
                    </span>
                  </div>
                  {activeId === prob.id && <ChevronRight size={16} style={{color: '#3B82F6', flexShrink: 0}} />}
                </motion.button>
              );
            })}
          </div>

          {/* Worker Status */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: '#3B82F6',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              <Activity size={14} />
              Worker Nodes
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px'
            }}>
              {Array.from({ length: workersCount }, (_, i) => i + 1).map(w => (
                <div 
                  key={w} 
                  style={{
                    height: '32px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: loading ? '#3B82F6' : '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    animation: loading ? 'pulse 1s ease-in-out infinite' : 'none',
                    animationDelay: `${w * 0.1}s`,
                    boxShadow: loading ? '0 1px 3px rgba(59, 130, 246, 0.2)' : 'none'
                  }}
                >
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: loading ? '#FFFFFF' : '#9CA3AF'
                  }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER - Problem Description & Editor */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB'}}>
          
          {/* Problem Header */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E5E7EB',
            background: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{
                fontWeight: '700',
                fontSize: '18px',
                color: '#1F2937',
                margin: 0
              }}>
                {currentProblem.id}. {currentProblem.title}
              </h2>
              {currentProblem.difficulty && (
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: 700,
                  background: getDifficultyColor(currentProblem.difficulty).bg,
                  color: getDifficultyColor(currentProblem.difficulty).text,
                  border: `1px solid ${getDifficultyColor(currentProblem.difficulty).border}`
                }}>
                  {currentProblem.difficulty}
                </span>
              )}
            </div>
            <p style={{fontSize: '13px', color: '#6B7280', fontWeight: '400', margin: 0, lineHeight: '1.5'}}>
              {currentProblem.desc}
            </p>
          </div>

          {/* View Switcher */}
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid #E5E7EB',
            background: '#F9FAFB',
            display: 'flex',
            gap: '4px'
          }}>
            <button 
              onClick={() => setActiveView('code')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeView === 'code' ? '#FFFFFF' : 'transparent',
                color: activeView === 'code' ? '#1E40AF' : '#6B7280',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s',
                boxShadow: activeView === 'code' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              <FileText size={14} /> Code
            </button>
            <button 
              onClick={() => setActiveView('notes')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeView === 'notes' ? '#FFFFFF' : 'transparent',
                color: activeView === 'notes' ? '#1E40AF' : '#6B7280',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s',
                boxShadow: activeView === 'notes' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              <MessageSquare size={14} /> Notes
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'hidden', background: '#FFFFFF' }}>
            {activeView === 'code' ? (
              <Editor
                key={activeId}
                height="100%"
                width="100%"
                value={currentProblem.code}
                language="javascript"
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: '"Fira Code", Monaco, "Courier New", monospace',
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  smoothScrolling: true,
                  padding: { top: 16, bottom: 16 }
                }}
                onMount={(editor) => { editorRef.current = editor; editor.layout(); }}
                onChange={(value) => updateProblemData('code', value ?? '')}
              />
            ) : (
              <div ref={wbContainerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
                <textarea
                  placeholder="Write your notes here..."
                  value={currentProblem.notes}
                  onChange={(e) => updateProblemData('notes', e.target.value)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    resize: 'none',
                    border: 'none',
                    outline: 'none',
                    background: '#FFFFFF',
                    color: '#1F2937',
                    lineHeight: '1.6',
                    fontSize: '14px',
                    padding: '20px 24px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: wbPos.x,
                    top: wbPos.y,
                    width: wbPos.w,
                    height: wbPos.h,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    onMouseDown={onWbHeaderMouseDown}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: '#F9FAFB',
                      borderBottom: '1px solid #E5E7EB',
                      fontSize: '12px',
                      color: '#374151',
                      cursor: 'move'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Whiteboard</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={wbBrushColor} onChange={(e) => setWbBrushColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', padding: 0, background: 'transparent' }} />
                      <input type="range" min={1} max={12} value={wbBrushSize} onChange={(e) => setWbBrushSize(Number(e.target.value))} />
                      <button onClick={() => { const c = wbCanvasRef.current; if (c) { const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); } }} style={{ border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 8px', fontSize: 12, background: '#FFFFFF', cursor: 'pointer' }}>Clear</button>
                    </div>
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <canvas
                      ref={wbCanvasRef}
                      width={wbPos.w}
                      height={wbPos.h - 34}
                      onMouseDown={onWbCanvasMouseDown}
                      style={{ width: '100%', height: '100%', cursor: wbDrawing ? 'crosshair' : 'default' }}
                    />
                    <div
                      onMouseDown={onWbResizeMouseDown}
                      style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize', background: 'transparent' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - Output Panel */}
        <div style={{
          width: '400px',
          background: '#FFFFFF',
          borderLeft: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
            background: '#F9FAFB'
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Cpu size={14} />
              Test Results
            </span>
          </div>

          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#FFFFFF'}}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {!currentProblem.output && !loading && (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #E5E7EB'
                  }}>
                    <Cpu size={28} style={{color: '#9CA3AF'}}/>
                  </div>
                  <p style={{fontSize: '13px', fontWeight: '600', color: '#6B7280'}}>
                    Click "Run Code" to see results
                  </p>
                </div>
              )}

              {loading && (
                <div style={{padding: '16px'}}>
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      style={{
                        height: '10px',
                        background: '#E5E7EB',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        width: `${80 - i * 15}%`,
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}
                    />
                  ))}
                </div>
              )}

              {currentProblem.output && (
                <div>
                  <div 
                    onClick={() => currentProblem.output.status === "Accepted" && setIsModalOpen(true)}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: currentProblem.output.status === "Accepted" ? '#10B981' : '#EF4444',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      background: currentProblem.output.status === "Accepted" 
                        ? 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' 
                        : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                      cursor: currentProblem.output.status === "Accepted" ? 'pointer' : 'default',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <span style={{fontSize: '20px', fontWeight: '700', marginBottom: '6px', color: currentProblem.output.status === "Accepted" ? '#047857' : '#B91C1C'}}>
                      {currentProblem.output.status}
                    </span>
                    <span style={{fontSize: '13px', fontWeight: '600', color: currentProblem.output.status === "Accepted" ? '#065F46' : '#991B1B'}}>
                      {currentProblem.output.passedTests} / {currentProblem.output.totalTests} test cases passed
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
              {recentProblems.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    color: '#6B7280',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    <FileText size={14} />
                    Recent Activity
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recentProblems.map(rp => (
                      <div key={rp.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        padding: '8px',
                        fontSize: '12px'
                      }}>
                        <span style={{ fontWeight: 600, color: '#1F2937', fontSize: '11px' }}>
                          {rp.id}. {rp.title}
                        </span>
                        {rp.latest_status === 'Accepted' ? (
                          <CheckCircle2 size={14} color="#10B981" />
                        ) : rp.latest_status ? (
                          <XCircle size={14} color="#EF4444" />
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #D1D5DB' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#FFFFFF', borderRadius: '16px', width: 'min(800px, 90vw)', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #E5E7EB', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, color: '#1F2937', fontSize: '16px' }}>Test Case Results</div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ 
                    border: 'none', 
                    background: '#F3F4F6', 
                    cursor: 'pointer', 
                    fontWeight: 600, 
                    color: '#6B7280',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                    {currentProblem.output?.totalTests} test cases
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                    {currentProblem.output?.workerCount ?? workersCount} nodes
                  </div>
                </div>
                {currentProblem.output?.details.map((res, i) => (
                  <div key={i} style={{ 
                    background: '#F9FAFB', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    border: '1px solid #E5E7EB',
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px' 
                  }}>
                    {res.passed 
                      ? <CheckCircle2 size={18} style={{color: '#10B981', marginTop: '2px', flexShrink: 0}}/> 
                      : <XCircle size={18} style={{color: '#EF4444', marginTop: '2px', flexShrink: 0}}/>
                    }
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        {res.workerId !== undefined && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Node {res.workerId}</span>
                        )}
                        {res.durationMs !== undefined && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>{res.durationMs} ms</span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        fontFamily: 'Monaco, monospace', 
                        fontWeight: '600', 
                        color: '#6B7280',
                        marginBottom: '8px'
                      }}>
                        Input: <span style={{color: '#1F2937'}}>{JSON.stringify(res.input)}</span>
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#1F2937', 
                        fontWeight: '600',
                        background: '#FFFFFF',
                        padding: '10px',
                        borderRadius: '8px',
                        fontFamily: 'Monaco, monospace',
                        border: '1px solid #E5E7EB'
                      }}>
                        <div style={{color: '#10B981'}}>Expected: {JSON.stringify(res.expected)}</div>
                        <div style={{color: res.passed ? '#10B981' : '#EF4444', marginTop: '4px'}}>
                          Output: {res.error ? ('Error: ' + res.error) : JSON.stringify(res.actual)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
