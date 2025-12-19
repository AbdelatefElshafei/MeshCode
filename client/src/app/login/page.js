"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    try {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const incomingToken = params?.get("token");
      if (incomingToken) {
        try { localStorage.setItem("authToken", incomingToken); } catch {}
        router.replace("/");
        return;
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      if (token) { router.replace("/"); return; }
      setAuthChecked(true);
    } catch {
      setAuthChecked(true);
    }
  }, [router]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const url = mode === "login" ? "http://localhost:3001/auth/login" : "http://localhost:3001/auth/register";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Request failed");
        setLoading(false);
        return;
      }
      if (mode === "login") {
        if (data?.token) {
          try { localStorage.setItem("authToken", data.token); } catch {}
        }
        router.push("/");
      } else {
        setMode("login");
      }
      setLoading(false);
    } catch (err) {
      setError("Server not reachable");
      setLoading(false);
    }
  };

  if (!authChecked) return null;
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F9FAFB",
      padding: "24px"
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #E5E7EB",
          padding: "40px 36px"
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{
              fontSize: "26px",
              fontWeight: "700",
              color: "#1F2937",
              marginBottom: "6px",
              letterSpacing: "-0.01em"
            }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </div>

            <div style={{
              fontSize: "14px",
              color: "#6B7280",
              marginBottom: "28px",
              fontWeight: "400"
            }}>
              {mode === "login" ? "Sign in to continue coding" : "Join the community"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    outline: "none",
                    fontSize: "14px",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    background: "#FFFFFF",
                    color: "#1F2937"
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid #3B82F6";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid #D1D5DB";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "8px"
                }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    outline: "none",
                    fontSize: "14px",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    background: "#FFFFFF",
                    color: "#1F2937"
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid #3B82F6";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid #D1D5DB";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "#FEE2E2",
                    border: "1px solid #FCA5A5",
                    color: "#DC2626",
                    fontSize: "13px",
                    fontWeight: "500"
                  }}
                >
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  color: "#FFFFFF",
                  fontWeight: "600",
                  fontSize: "14px",
                  background: loading ? "#9CA3AF" : "#3B82F6",
                  boxShadow: loading ? "none" : "0 1px 3px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s",
                  marginTop: "4px"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = "#2563EB";
                    e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = "#3B82F6";
                    e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                  }
                }}
              >
                {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: "24px 0 20px"
            }}>
              <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
              <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: "500" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
            </div>

            <button
              onClick={() => { window.location.href = "http://localhost:3001/auth/google"; }}
              type="button"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "12px 20px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                background: "#FFFFFF",
                color: "#374151",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#9CA3AF";
                e.target.style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#D1D5DB";
                e.target.style.background = "#FFFFFF";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div style={{
              marginTop: "24px",
              fontSize: "14px",
              color: "#6B7280",
              textAlign: "center"
            }}>
              {mode === "login" ? (
                <span>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setMode("register")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#3B82F6",
                      cursor: "pointer",
                      fontWeight: "600",
                      textDecoration: "none"
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                    onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("login")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#3B82F6",
                      cursor: "pointer",
                      fontWeight: "600",
                      textDecoration: "none"
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                    onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}