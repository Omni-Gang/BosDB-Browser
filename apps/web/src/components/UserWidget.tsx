'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { User, Shield, Users, LogOut, ChevronRight, X, Loader2 } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface TeamMemberData {
    id: string;
    name: string;
    email: string;
    role: string;
    status?: 'online' | 'offline' | 'away';
}

export function UserWidget() {
    const [user, setUser] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const u = getCurrentUser();
        setUser(u);
    }, []);

    const fetchTeamMembers = async () => {
        if (!user?.organizationId) return;

        setLoadingTeam(true);
        try {
            const res = await fetch(`/api/org/members?orgId=${encodeURIComponent(user.organizationId)}`, {
                headers: {
                    'x-user-email': user?.email || '',
                    'x-org-id': user?.organizationId || ''
                }
            });

            if (res.ok) {
                const data = await res.json();
                setTeamMembers(data.members || []);
            }
        } catch (error) {
            console.error('Failed to fetch team members:', error);
        } finally {
            setLoadingTeam(false);
        }
    };

    if (!user) return null;

    const handleLogout = () => {
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        localStorage.removeItem('bosdb-user');
        router.push('/login');
    };

    return (
        <>
            {/* Floating Widget */}
            <div
                className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${expanded ? 'translate-x-0' : 'translate-x-0'}`}
            >
                {/* Expanded Card */}
                {expanded && (
                    <div className="bg-card border border-border shadow-xl rounded-lg p-4 mb-3 w-64 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold truncate">{user.name || 'User'}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <Shield className="w-4 h-4" />
                                    Role
                                </span>
                                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {user.role || 'User'}
                                </span>
                            </div>

                            {user.organizationId && (
                                <button
                                    onClick={() => setShowTeam(true)}
                                    className="w-full flex items-center justify-between text-sm p-2 rounded hover:bg-accent text-left"
                                >
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="w-4 h-4" />
                                        Team
                                    </span>
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-between text-sm p-2 rounded hover:bg-destructive/10 text-destructive text-left mt-2"
                            >
                                <span className="flex items-center gap-2">
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="h-12 w-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
                >
                    <User className="w-6 h-6" />
                </button>
            </div>

            {/* Team Sidebar */}
            {showTeam && (
                <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-2xl z-[60] p-6 animate-in slide-in-from-right">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Team Members
                        </h2>
                        <button
                            onClick={() => setShowTeam(false)}
                            className="p-1 hover:bg-accent rounded"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Organization</p>
                            <p className="font-medium">{user.organizationName || user.organizationId}</p>
                        </div>

                        <div className="space-y-3">
                            {/* Current user always at top */}
                            <TeamMember name={user.name} email={user.email} role={user.role} isMe />

                            {/* Loading state */}
                            {loadingTeam && (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Loading team...</span>
                                </div>
                            )}

                            {/* Real team members from API */}
                            {!loadingTeam && teamMembers.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No other team members yet
                                </p>
                            )}

                            {!loadingTeam && teamMembers
                                .filter(m => m.email !== user.email)
                                .map((member) => (
                                    <TeamMember
                                        key={member.id || member.email}
                                        name={member.name}
                                        email={member.email}
                                        role={member.role}
                                        status={member.status}
                                    />
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Backdrop for Team Sidebar */}
            {showTeam && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55]"
                    onClick={() => setShowTeam(false)}
                />
            )}
        </>
    );
}

function TeamMember({ name, email, role, status = 'online', isMe = false }: any) {
    return (
        <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
            <div className="relative">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs font-medium">
                    {name?.charAt(0) || '?'}
                </div>
                {!isMe && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${status === 'online' ? 'bg-green-500' :
                        status === 'away' ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                        {name || 'Unknown'}
                        {isMe && <span className="ml-1 text-[10px] text-muted-foreground">(You)</span>}
                    </p>
                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                        {role || 'Member'}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
        </div>
    );
}
