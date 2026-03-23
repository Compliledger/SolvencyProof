import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/solvencyproof-logo.png";
import Aurora from "@/components/reactbits/Aurora";
import { Lock, Activity, Mail } from "lucide-react";

type Role = "verifier" | "operator" | "auditor";

const roles = [
    { key: "verifier" as Role, title: "Verifier", desc: "Check inclusion" },
    { key: "operator" as Role, title: "Operator", desc: "Manage reports" },
    { key: "auditor" as Role, title: "Auditor", desc: "Validate proofs" },
];

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [selectedRole, setSelectedRole] = useState<Role>("operator");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streamActive, setStreamActive] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/verify';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    // Initialize webcam
    useEffect(() => {
        let stream: MediaStream | null = null;

        const startWebcam = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStreamActive(true);
                }
            } catch (err) {
                console.error('Webcam access denied:', err);
            }
        };

        startWebcam();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole || !email || !name || !password) return;

        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Use AuthContext login - stores in localStorage automatically
        login(name, email, selectedRole);

        // Navigate to intended destination or default
        const from = (location.state as any)?.from?.pathname || '/verify';
        navigate(from, { replace: true });
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex items-center justify-center">
            {/* Aurora Background - More White/Bright */}
            <div className="absolute inset-0 z-0">
                <Aurora
                    colorStops={["#FFFFFF", "#E0E0E0", "#CCCCCC", "#F5F5F5", "#FFFFFF"]}
                    blend={0.6}
                    amplitude={1.5}
                    speed={0.4}
                />
            </div>

            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-background/60 via-background/40 to-background/70" />

            {/* Content */}
            <div className="relative z-10 w-full max-w-5xl px-6 flex items-center gap-16">

                {/* Left Column - Reflective ID Card */}
                <div className="hidden lg:flex flex-1 justify-center">
                    <div className="relative w-[300px] h-[420px] rounded-[20px] overflow-hidden bg-[#1a1a1a] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)_inset] isolate">
                        {/* SVG Filter */}
                        <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
                            <defs>
                                <filter id="metallic-displacement" x="-20%" y="-20%" width="140%" height="140%">
                                    <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="2" result="noise" />
                                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" result="rippled" />
                                </filter>
                            </defs>
                        </svg>

                        {/* Webcam */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute top-0 left-0 w-full h-full object-cover scale-[1.15] -scale-x-100 z-0 opacity-95"
                            style={{
                                filter: 'saturate(0.1) contrast(115%) brightness(105%) blur(4px) url(#metallic-displacement)'
                            }}
                        />

                        {/* Noise */}
                        <div className="absolute inset-0 z-10 opacity-30 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%270%200%20200%20200%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cfilter%20id%3D%27noiseFilter%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.8%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url(%23noiseFilter)%27%2F%3E%3C%2Fsvg%3E')] mix-blend-overlay" />

                        {/* Metallic Gradient */}
                        <div className="absolute inset-0 z-20 bg-[linear-gradient(135deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.2)_100%)] pointer-events-none mix-blend-overlay" />

                        {/* Border */}
                        <div className="absolute inset-0 rounded-[20px] p-[1px] bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.4)_100%)] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] z-20 pointer-events-none" />

                        {/* Card Content */}
                        <div className="relative z-30 h-full flex flex-col justify-between p-5 text-white">
                            {/* Top Bar - Minimal */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5 text-[8px] font-bold tracking-[0.12em] px-2 py-1 bg-white/10 rounded border border-white/15">
                                    <Lock size={10} className="opacity-70" />
                                    <span>SECURE</span>
                                </div>
                                <img src={logo} alt="SolvencyProof" className="h-4 w-auto opacity-50" />
                            </div>

                            {/* Center - Empty for face visibility */}
                            <div className="flex-1" />

                            {/* Bottom - User Info */}
                            <div className="bg-black/40 backdrop-blur-sm -mx-5 -mb-5 px-5 py-4 rounded-b-[20px]">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold tracking-[0.04em] drop-shadow-lg uppercase leading-tight">
                                            {name || "YOUR NAME"}
                                        </h2>
                                        <p className="text-[9px] tracking-[0.2em] opacity-70 uppercase mt-0.5">
                                            {selectedRole.toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[7px] tracking-[0.1em] opacity-40 block">EMAIL</span>
                                        <span className="font-mono text-[10px] tracking-[0.02em] opacity-80">{email || "email@company.com"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Login Form */}
                <div className="flex-1 max-w-md">
                    {/* Logo */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <img src={logo} alt="SolvencyProof" className="h-9 w-auto" />
                            <span className="font-display text-lg font-medium">SolvencyProof</span>
                        </div>
                        <h1 className="font-display text-2xl font-semibold mb-1">Verification Portal</h1>
                        <p className="text-sm text-muted-foreground">Sign in to access your account</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                            <div className="flex gap-2">
                                {roles.map((role) => (
                                    <button
                                        key={role.key}
                                        type="button"
                                        onClick={() => setSelectedRole(role.key)}
                                        className={`flex-1 p-3 rounded-lg border text-center transition-all ${selectedRole === role.key
                                            ? "border-accent bg-accent/10"
                                            : "border-border hover:border-accent/40"
                                            }`}
                                    >
                                        <p className="font-medium text-sm">{role.title}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-11 px-4 rounded-lg border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
                                required
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!email || !name || !password || isLoading}
                            className="w-full h-11 rounded-lg bg-accent text-accent-foreground font-medium transition-all hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-muted-foreground pt-2">
                            <button type="button" onClick={() => navigate("/")} className="hover:text-foreground transition-colors">
                                ← Back to website
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
