import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Shield, Lock, User } from 'lucide-react';
import { useWebAuthn } from '../hooks/useWebAuthn';

export default function Login({ onLoginSuccess }) {
    const { register, login, loading, error } = useWebAuthn();
    const [username, setUsername] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!username.trim()) return alert("Please enter a username first.");
        const success = await register(username.trim());
        if (success) {
            alert("Device registered successfully! You can now log in.");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username.trim()) return alert("Please enter a username first.");
        const user = await login(username.trim());
        if (user) {
            onLoginSuccess(user);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background bg-opacity-95 p-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-md w-full backdrop-blur-lg bg-white/5 border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -m-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="text-center mb-8 relative z-10">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 border border-accent/20 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                        <Shield className="w-8 h-8 text-accent" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SecurePass Vault</h1>
                    <p className="text-slate-400 text-sm">Your Identity, Cryptographically Sealed.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-6 relative z-10 mt-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Enter a Unique Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-accent outline-none transition-all focus:bg-slate-800"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleRegister}
                            disabled={loading || !username.trim()}
                            className="flex items-center justify-center gap-2 py-4 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors border border-slate-700 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Lock className="w-5 h-5" />
                            Register Device
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleLogin}
                            disabled={loading || !username.trim()}
                            className="flex items-center justify-center gap-2 py-4 px-4 bg-accent hover:bg-cyan-400 text-slate-900 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Fingerprint className="w-6 h-6" />
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </motion.button>
                    </div>
                </div>

                <div className="mt-8 text-center border-t border-slate-800 pt-6">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" /> FIDO2 Passwordless & Zero-Knowledge E2EE
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
