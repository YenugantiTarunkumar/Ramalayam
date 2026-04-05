"use client";

import { useAuth } from "@/context/AuthContext";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader">Loading...</div>
        <style jsx>{`
          .loader-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #fffcf9;
          }
          .loader {
            color: var(--primary);
            font-size: 1.5rem;
            font-weight: 600;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
}
