import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // For demo, checking if keys exist locally indicating a returning user session.
    // In production, validate short-lived JWT via HTTP-only cookie.
    const pubKey = localStorage.getItem('securepass_public_key');
    if (pubKey) {
      // Mock session logic
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="antialiased selection:bg-accent selection:text-slate-900">
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
