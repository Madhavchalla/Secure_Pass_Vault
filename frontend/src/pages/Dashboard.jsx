import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    FileText,
    CreditCard,
    GraduationCap,
    Activity,
    Car,
    Briefcase,
    Building,
    UploadCloud,
    X,
    Lock,
    Eye,
    Download,
    Trash2
} from 'lucide-react';
import { encryptDocumentForUpload, decryptDocument } from '../utils/crypto';

const CATEGORIES = [
    { id: 'IDENTITY', label: 'Identity', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'FINANCIAL', label: 'Financial', icon: CreditCard, color: 'text-green-400', bg: 'bg-green-400/10' },
    { id: 'EDUCATION', label: 'Education', icon: GraduationCap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { id: 'MEDICAL', label: 'Medical', icon: Activity, color: 'text-red-400', bg: 'bg-red-400/10' },
    { id: 'VEHICLE', label: 'Vehicle', icon: Car, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'EMPLOYMENT', label: 'Employment', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'PROPERTY', label: 'Property', icon: Building, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { id: 'GOVERNMENT', label: 'Govt & Welfare', icon: Building, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { id: 'INSURANCE', label: 'Insurance', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'ASSETS', label: 'Digital Assets', icon: Lock, color: 'text-rose-400', bg: 'bg-rose-400/10' },
];

export default function Dashboard({ user, onLogout }) {
    const [documents, setDocuments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [category, setCategory] = useState('IDENTITY');

    // Viewing state
    const [viewingCategory, setViewingCategory] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [decrypting, setDecrypting] = useState(false);
    const [decryptedUrl, setDecryptedUrl] = useState(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`https://backend-securepass.vercel.app/api/documents?email=${encodeURIComponent(user.email)}`);
            const data = await res.json();
            if (res.ok) {
                setDocuments(data.documents || []);
            }
        } catch (err) {
            console.error("Failed to fetch documents", err);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        try {
            // 1. Get Public Key from Local Storage
            const pubKey = localStorage.getItem('securepass_public_key');
            if (!pubKey) throw new Error("Public Key not found on device. Please re-register.");

            // 2. Encrypt File Locally (Zero-Knowledge)
            const { encryptedFile, encryptedAESKey } = await encryptDocumentForUpload(file, pubKey);

            // 3. Upload to Backend
            const payload = {
                email: user.email,
                category,
                fileName: file.name, // In pure ZK, file name would also be encrypted
                encryptedFile,
                encryptedAESKey
            };

            const res = await fetch('https://backend-securepass.vercel.app/api/documents/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Encrypted Document Saved Securely!");
                setIsModalOpen(false);
                setFile(null);
                fetchDocuments();
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
            alert(`Encryption/Upload Error: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleCategoryClick = (categoryId) => {
        setViewingCategory(categoryId);
        setDecryptedUrl(null);
        setSelectedDoc(null);
    };

    const handleViewDocument = async (docId, fileName) => {
        setDecrypting(true);
        setDecryptedUrl(null);
        setSelectedDoc(fileName);

        try {
            // 1. Fetch encrypted payload from server
            const res = await fetch(`https://backend-securepass.vercel.app/api/documents/${docId}?email=${encodeURIComponent(user.email)}`);
            if (!res.ok) throw new Error("Failed to fetch document");

            const data = await res.json();

            // 2. Get Private Key
            const privKey = localStorage.getItem('securepass_private_key');
            if (!privKey) throw new Error("Private key missing. Cannot decrypt.");

            // 3. Decrypt locally
            const decryptedBuffer = await decryptDocument(data.encryptedFile, data.encryptedAESKey, privKey);

            // 4. Create local blob URL for viewing
            const blob = new Blob([decryptedBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            setDecryptedUrl(url);

        } catch (err) {
            console.error(err);
            alert(`Decryption Error: ${err.message}`);
            setSelectedDoc(null);
        } finally {
            setDecrypting(false);
        }
    };

    const handleDeleteDocument = async (docId, fileName, e) => {
        e.stopPropagation(); // Prevent opening the viewer when clicking trash

        if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`https://backend-securepass.vercel.app/api/documents/${docId}?email=${encodeURIComponent(user.email)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Remove from local state
                setDocuments(prev => prev.filter(d => d.id !== docId));
                if (selectedDoc === fileName) {
                    setSelectedDoc(null);
                    setDecryptedUrl(null);
                }
            } else {
                const err = await res.json();
                alert(`Delete failed: ${err.error}`);
            }
        } catch (err) {
            console.error("Failed to delete document", err);
            alert("Error deleting document");
        }
    };

    return (
        <div className="min-h-screen bg-background text-white p-6 md:p-12">
            {/* Header */}
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/30">
                        <Shield className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Vault Dashboard</h1>
                        <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="text-sm px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
                >
                    Lock Vault
                </button>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold">Your Encrypted Documents</h2>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-accent hover:bg-cyan-400 text-slate-900 px-5 py-2.5 rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                    >
                        <UploadCloud className="w-5 h-5" />
                        Upload File
                    </motion.button>
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {CATEGORIES.map((cat, i) => {
                        const Icon = cat.icon;
                        const count = documents.filter(d => d.category === cat.id).length;

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800 transition-colors cursor-pointer group"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cat.bg}`}>
                                    <Icon className={`w-6 h-6 ${cat.color}`} />
                                </div>
                                <h3 className="font-medium text-slate-200 group-hover:text-white transition-colors">{cat.label}</h3>
                                <p className="text-sm text-slate-500 mt-1">{count} Documents</p>
                            </motion.div>
                        )
                    })}
                </div>
            </main>

            {/* Upload Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => !uploading && setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl p-6 overflow-hidden"
                        >
                            <button
                                onClick={() => !uploading && setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-accent" /> Secure Upload
                            </h3>

                            <form onSubmit={handleUpload} className="space-y-5">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Document Category</label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-accent outline-none"
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Select File</label>
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files[0])}
                                        required
                                        className="w-full text-sm text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">File will be AES-256 encrypted before leaving this device.</p>
                                </div>

                                <motion.button
                                    whileTap={{ scale: uploading ? 1 : 0.98 }}
                                    type="submit"
                                    disabled={uploading || !file}
                                    className="w-full bg-accent hover:bg-cyan-400 text-slate-900 font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                                >
                                    {uploading ? (
                                        <span className="animate-pulse">Encrypting & Uploading...</span>
                                    ) : (
                                        <>
                                            <Shield className="w-5 h-5" />
                                            Encrypt & Save
                                        </>
                                    )}
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Document Viewer Modal */}
            <AnimatePresence>
                {viewingCategory && (
                    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setViewingCategory(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl p-6 overflow-hidden max-h-[90vh] flex flex-col flex-1"
                        >
                            <button
                                onClick={() => setViewingCategory(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full cursor-pointer z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-2xl font-bold mb-6 pb-4 border-b border-slate-800 flex items-center gap-3">
                                {CATEGORIES.find(c => c.id === viewingCategory)?.label} Vault
                            </h3>

                            <div className="flex flex-col md:flex-row gap-6 h-full min-h-[50vh] overflow-y-auto md:overflow-visible">
                                {/* Sidebar doc list */}
                                <div className="w-full md:w-1/3 md:min-w-[250px] md:border-r border-slate-800 md:pr-4">
                                    <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Stored Files</h4>
                                    <div className="space-y-2 flex-col flex max-h-[30vh] md:max-h-full overflow-y-auto">
                                        {documents.filter(d => d.category === viewingCategory).length === 0 && (
                                            <p className="text-slate-500 text-sm p-4 bg-slate-800/30 rounded-xl text-center">No documents here yet.</p>
                                        )}
                                        {documents.filter(d => d.category === viewingCategory).map(doc => (
                                            <div key={doc.id} className={`w-full text-left pr-2 py-2 pl-4 rounded-xl transition-all flex items-center justify-between gap-3 shrink-0 ${selectedDoc === doc.fileName ? 'bg-accent/20 border border-accent/50' : 'bg-slate-800 hover:bg-slate-700 border border-transparent'}`}>
                                                <button
                                                    onClick={() => handleViewDocument(doc.id, doc.fileName)}
                                                    className="flex-1 flex items-center gap-3 overflow-hidden"
                                                >
                                                    <FileText className={`w-5 h-5 shrink-0 ${selectedDoc === doc.fileName ? 'text-accent' : 'text-slate-400'}`} />
                                                    <div className="truncate flex-1 text-left">
                                                        <p className={`text-sm font-medium truncate ${selectedDoc === doc.fileName ? 'text-white' : 'text-slate-300'}`}>{doc.fileName}</p>
                                                        <p className="text-xs text-slate-500 mt-1">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteDocument(doc.id, doc.fileName, e)}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                                                    title="Delete Document"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Main Viewer */}
                                <div className="w-full md:w-2/3 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-slate-800/50 p-4 relative overflow-hidden min-h-[40vh]">
                                    {!selectedDoc && !decrypting && (
                                        <div className="text-center">
                                            <Lock className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                            <p className="text-slate-500">Select a file to locally decrypt & view</p>
                                            <p className="text-xs text-slate-600 mt-1">Zero-Knowledge Proof: Server cannot see this data.</p>
                                        </div>
                                    )}

                                    {decrypting && (
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-12 h-12 border-4 border-accent border-t-transparent flex-1 rounded-full animate-spin"></div>
                                            <p className="text-accent font-medium animate-pulse">Decrypting locally inside browser...</p>
                                        </div>
                                    )}

                                    {decryptedUrl && (
                                        <div className="w-full h-full flex flex-col">
                                            <div className="flex justify-between items-center mb-4 px-2">
                                                <h5 className="font-semibold text-white">{selectedDoc}</h5>
                                                <a
                                                    href={decryptedUrl}
                                                    download={selectedDoc}
                                                    className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700"
                                                >
                                                    <Download className="w-4 h-4" /> Download
                                                </a>
                                            </div>

                                            {selectedDoc.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                <img src={decryptedUrl} alt="Decrypted" className="max-w-full max-h-[60vh] object-contain mx-auto rounded-xl border border-white/10" />
                                            ) : selectedDoc.match(/\.(pdf)$/i) ? (
                                                <iframe src={decryptedUrl} className="w-full flex-1 bg-white rounded-xl border-none min-h-[60vh]"></iframe>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/50 rounded-xl border border-white/5 border-dashed">
                                                    <FileText className="w-16 h-16 text-slate-500 mb-4" />
                                                    <p className="text-slate-300">File decrypted successfully.</p>
                                                    <a
                                                        href={decryptedUrl}
                                                        download={selectedDoc}
                                                        className="mt-4 text-accent hover:underline flex flex-col items-center gap-2"
                                                    >
                                                        Click here to download to your device
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
