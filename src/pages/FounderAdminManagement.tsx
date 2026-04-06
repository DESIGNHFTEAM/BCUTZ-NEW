import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, Shield, ShieldCheck, ShieldX, Search, 
  UserPlus, UserMinus, Mail, User, Loader2, Activity, ChevronRight, Scissors, Users, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FounderBadge } from '@/components/FounderBadge';
import { AdminBadge } from '@/components/AdminBadge';

interface UserWithRoles {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
  created_at: string;
}

function FounderAdminManagementContent() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admins' | 'barbers' | 'customers'>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [actionType, setActionType] = useState<'grant' | 'revoke' | 'delete' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletionStep, setDeletionStep] = useState<'request' | 'confirm'>('request');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [deletionMessage, setDeletionMessage] = useState('');

  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && hasRole('founder')) {
      fetchUsers();

      // Subscribe to real-time user_roles changes for immediate UI updates
      const rolesChannel = supabase
        .channel('founder-roles-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
          },
          (payload) => {
            console.log('User roles change detected:', payload);
            fetchUsers();
          }
        )
        .subscribe();

      // Subscribe to profiles changes
      const profilesChannel = supabase
        .channel('founder-profiles-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
          },
          (payload) => {
            console.log('Profile change detected:', payload);
            fetchUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(rolesChannel);
        supabase.removeChannel(profilesChannel);
      };
    }
  }, [user, hasRole]);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Fetch all user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    // Combine profiles with roles
    const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
      const userRoles = (roles || [])
        .filter(r => r.user_id === profile.id)
        .map(r => r.role);
      
      return {
        ...profile,
        roles: userRoles,
      };
    });

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  const handleManageAdmin = async () => {
    if (!selectedUser || !actionType) return;

    setIsProcessing(true);

    try {
      if (actionType === 'delete') {
        // Founders can delete directly without email confirmation
        const { data, error } = await supabase.functions.invoke('delete-user-account', {
          body: { 
            target_user_id: selectedUser.id, 
            is_founder_action: true,
            action: 'confirm_deletion',
            skip_confirmation: true,
            founder_message: deletionMessage || undefined
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: 'Account Deleted',
          description: `Successfully deleted account for ${selectedUser.full_name || selectedUser.email}.`,
        });
      } else {
        const { error } = await supabase.rpc('manage_admin_role', {
          target_user_id: selectedUser.id,
          action: actionType,
        });

        if (error) throw error;

        // Optimistically update the UI immediately
        setUsers(prevUsers => 
          prevUsers.map(u => {
            if (u.id === selectedUser.id) {
              return {
                ...u,
                roles: actionType === 'grant' 
                  ? [...u.roles, 'admin']
                  : u.roles.filter(r => r !== 'admin')
              };
            }
            return u;
          })
        );

        // Send email notification (async, don't block UI)
        supabase.functions.invoke('send-admin-role-notification', {
          body: { 
            target_user_id: selectedUser.id, 
            action: actionType 
          }
        }).catch(emailError => {
          console.error('Failed to send email notification:', emailError);
        });

        toast({
          title: actionType === 'grant' ? 'Admin granted' : 'Admin revoked',
          description: `Successfully ${actionType === 'grant' ? 'granted admin access to' : 'revoked admin access from'} ${selectedUser.full_name || selectedUser.email}. Email notification sent.`,
        });
      }

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${actionType} action`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedUser(null);
      setActionType(null);
      setDeletionStep('request');
      setConfirmationCode('');
      setDeletionMessage('');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    if (filterType === 'admins') {
      return matchesSearch && u.roles.includes('admin');
    } else if (filterType === 'barbers') {
      return matchesSearch && u.roles.includes('barber');
    } else if (filterType === 'customers') {
      return matchesSearch && !u.roles.includes('barber') && !u.roles.includes('admin') && !u.roles.includes('founder');
    }
    return matchesSearch;
  });

  const adminCount = users.filter(u => u.roles.includes('admin')).length;
  const founderCount = users.filter(u => u.roles.includes('founder')).length;
  const barberCount = users.filter(u => u.roles.includes('barber')).length;
  const customerCount = users.filter(u => !u.roles.includes('barber') && !u.roles.includes('admin') && !u.roles.includes('founder')).length;

  const handleRefresh = useCallback(async () => {
    await fetchUsers();
    toast({
      title: 'Refreshed',
      description: 'User data has been updated',
    });
  }, [toast]);


  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh} className="pt-20 md:pt-28 pb-16 min-h-screen">
        <main>
          <div className="container mx-auto px-3 md:px-4">
          <Breadcrumbs />
          
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <Crown className="w-6 h-6 md:w-8 md:h-8 text-accent" />
              <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] text-accent font-semibold">FOUNDER ACCESS</p>
            </div>
            <h1 className="font-display text-2xl md:text-5xl font-bold tracking-wider">
              ADMIN MANAGEMENT
            </h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-3 md:mt-4">
              <p className="text-sm md:text-base text-foreground/80">
                Grant or revoke admin privileges
              </p>
              <Link 
                to="/founder/activity-log" 
                className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-foreground/80 hover:text-foreground transition-colors"
              >
                <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Activity Log
                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 md:p-4 border border-accent/30 bg-accent/5"
            >
              <Crown className="w-4 h-4 md:w-5 md:h-5 text-accent mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold text-foreground">{founderCount}</p>
              <p className="text-xs md:text-sm text-foreground/80">Founders</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 md:p-4 border border-primary/30 bg-primary/5"
            >
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold text-foreground">{adminCount}</p>
              <p className="text-xs md:text-sm text-foreground/80">Admins</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 md:p-4 border border-foreground/20 bg-secondary"
            >
              <Scissors className="w-4 h-4 md:w-5 md:h-5 text-foreground mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold text-foreground">{barberCount}</p>
              <p className="text-xs md:text-sm text-foreground/80">Barbers</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 md:p-4 border border-foreground/20 bg-secondary"
            >
              <Users className="w-4 h-4 md:w-5 md:h-5 text-foreground mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold text-foreground">{customerCount}</p>
              <p className="text-xs md:text-sm text-foreground/80">Customers</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <User className="w-4 h-4 md:w-5 md:h-5 text-foreground/70 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs md:text-sm text-foreground/80">Total</p>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-foreground/70" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-10 md:h-12 text-sm"
              />
            </div>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1">
              {(['all', 'admins', 'barbers', 'customers'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={filterType === filter ? 'default' : 'outline'}
                  onClick={() => setFilterType(filter)}
                  size="sm"
                  className="capitalize text-xs md:text-sm whitespace-nowrap px-2.5 md:px-4"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {/* User List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
              <p className="text-xl font-medium mb-2">No users found</p>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredUsers.map((userItem) => {
                const isFounder = userItem.roles.includes('founder');
                const isAdmin = userItem.roles.includes('admin');
                const isCurrentUser = userItem.id === user?.id;

                return (
                  <motion.div
                    key={userItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 md:p-4 border bg-card flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:justify-between ${
                      isFounder ? 'border-accent/30' : isAdmin ? 'border-primary/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isFounder 
                          ? 'bg-accent/20' 
                          : isAdmin 
                            ? 'bg-primary/20' 
                            : 'bg-muted'
                      }`}>
                        {isFounder ? (
                          <Crown className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                        ) : isAdmin ? (
                          <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        ) : (
                          <User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                          <span className="font-medium text-sm md:text-base truncate max-w-[120px] md:max-w-none text-foreground">
                            {userItem.full_name || 'Unnamed'}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] md:text-xs px-1.5">You</Badge>
                          )}
                          {isFounder && <FounderBadge showTooltip={false} />}
                          {isAdmin && !isFounder && <AdminBadge showTooltip={false} />}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-foreground/80 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{userItem.email || 'No email'}</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-foreground/75 mt-0.5 md:mt-1 flex flex-wrap gap-1">
                          {userItem.roles.includes('barber') && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Barber</Badge>
                          )}
                          {userItem.roles.includes('customer') && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-secondary border-border text-foreground">Customer</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto md:ml-0 flex-shrink-0">
                      {!isFounder && !isCurrentUser && (
                        <>
                          {isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(userItem);
                                setActionType('revoke');
                              }}
                              className="text-destructive hover:text-destructive text-xs h-8 px-2 md:px-3"
                            >
                              <UserMinus className="w-3.5 h-3.5 md:mr-1.5" />
                              <span className="hidden md:inline">Revoke</span>
                            </Button>
                          ) : userItem.roles.includes('barber') ? (
                            <Badge variant="secondary" className="text-accent text-[10px] md:text-xs whitespace-nowrap">
                              <Scissors className="w-3 h-3 mr-1" />
                              Can't be admin
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(userItem);
                                setActionType('grant');
                              }}
                              className="text-primary hover:text-primary text-xs h-8 px-2 md:px-3"
                            >
                              <UserPlus className="w-3.5 h-3.5 md:mr-1.5" />
                              <span className="hidden md:inline">Make Admin</span>
                            </Button>
                          )}
                            <Button
                              variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(userItem);
                              setActionType('delete');
                            }}
                              className="text-destructive border-destructive/40 hover:bg-destructive/10 text-xs h-8 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {isFounder && !isCurrentUser && (
                        <Badge variant="secondary" className="text-accent text-[10px] md:text-xs whitespace-nowrap">
                          Protected
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          </div>
        </main>
      </PullToRefresh>

      {/* Mobile Bottom Nav */}
{/* Confirmation Dialog */}
      <AlertDialog 
        open={!!selectedUser && !!actionType} 
        onOpenChange={() => {
          setSelectedUser(null);
          setActionType(null);
          setDeletionStep('request');
          setConfirmationCode('');
          setDeletionMessage('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === 'grant' ? (
                <ShieldCheck className="w-5 h-5 text-primary" />
              ) : actionType === 'delete' ? (
                <Trash2 className="w-5 h-5 text-destructive" />
              ) : (
                <ShieldX className="w-5 h-5 text-destructive" />
              )}
              {actionType === 'grant' 
                ? 'Grant Admin Access' 
                : actionType === 'delete' 
                  ? 'Delete Account'
                  : 'Revoke Admin Access'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {actionType === 'grant' ? (
                <>
                  You are about to grant admin privileges to{' '}
                  <span className="font-medium text-foreground">{selectedUser?.full_name || selectedUser?.email}</span>.
                  <br /><br />
                  Admin users can:
                  <ul className="list-disc list-inside mt-2">
                    <li>Verify barber profiles</li>
                    <li>View and manage reports</li>
                    <li>Access analytics dashboards</li>
                  </ul>
                </>
              ) : actionType === 'delete' ? (
                <>
                  You are about to <span className="font-medium text-destructive">permanently delete</span> the account of{' '}
                  <span className="font-medium text-foreground">{selectedUser?.full_name || selectedUser?.email}</span>.
                  <br /><br />
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message to customer (optional):
                  </label>
                  <textarea 
                    value={deletionMessage}
                    onChange={(e) => setDeletionMessage(e.target.value)}
                    placeholder="Explain the reason for account deletion..."
                    className="w-full p-3 border rounded-lg bg-background text-foreground text-sm resize-none h-20 mb-4"
                  />
                  This action will:
                  <ul className="list-disc list-inside mt-2 text-destructive">
                    <li>Delete all user data and profile</li>
                    <li>Remove all bookings history</li>
                    <li>Send a farewell email with your message</li>
                  </ul>
                  <br />
                  <span className="font-bold text-destructive">This action cannot be undone!</span>
                </>
              ) : (
                <>
                  You are about to revoke admin privileges from{' '}
                  <span className="font-medium text-foreground">{selectedUser?.full_name || selectedUser?.email}</span>.
                  <br /><br />
                  They will lose access to all admin features immediately.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleManageAdmin}
              disabled={isProcessing}
              className={actionType === 'grant' ? 'bg-primary' : 'bg-destructive hover:bg-destructive/90'}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : actionType === 'grant' ? (
                <ShieldCheck className="w-4 h-4 mr-2" />
              ) : actionType === 'delete' ? (
                <Trash2 className="w-4 h-4 mr-2" />
              ) : (
                <ShieldX className="w-4 h-4 mr-2" />
              )}
              {actionType === 'grant' 
                ? 'Grant Admin' 
                : actionType === 'delete' 
                  ? 'Delete Account'
              : 'Revoke Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// RouteGuard in App.tsx enforces founder role — no page-level wrapper needed.
export default function FounderAdminManagement() {
  return <FounderAdminManagementContent />;
}
