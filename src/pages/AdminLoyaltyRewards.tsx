import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Gift, Plus, Edit2, Trash2, Save, X, Loader2, 
  Trophy, Award, Crown, Gem, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { PageTransition } from '@/components/animations/PageTransition';

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_type: string;
  discount_value: number;
  min_tier: string | null;
  is_active: boolean;
  created_at: string;
}

const tierOptions = [
  { value: 'none', label: 'All Tiers', icon: null },
  { value: 'bronze', label: 'Bronze+', icon: Trophy, color: 'text-amber-700' },
  { value: 'silver', label: 'Silver+', icon: Award, color: 'text-slate-400' },
  { value: 'gold', label: 'Gold+', icon: Crown, color: 'text-yellow-500' },
  { value: 'platinum', label: 'Platinum Only', icon: Gem, color: 'text-cyan-400' },
];

function AdminLoyaltyRewardsContent() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin') || hasRole('founder');

  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reward: LoyaltyReward | null }>({
    open: false,
    reward: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_required: 100,
    discount_type: 'percentage',
    discount_value: 10,
    min_tier: 'none',
    is_active: true,
  });

  useEffect(() => {
    if (isAdmin) {
      fetchRewards();
    }
  }, [isAdmin]);

  const fetchRewards = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .order('points_required', { ascending: true });

    if (!error && data) {
      setRewards(data);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      points_required: 100,
      discount_type: 'percentage',
      discount_value: 10,
      min_tier: 'none',
      is_active: true,
    });
  };

  const startEditing = (reward: LoyaltyReward) => {
    setEditingId(reward.id);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      points_required: reward.points_required,
      discount_type: reward.discount_type,
      discount_value: reward.discount_value,
      min_tier: reward.min_tier || 'none',
      is_active: reward.is_active,
    });
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a reward name');
      return;
    }

    setIsSaving(true);
    const rewardData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      points_required: formData.points_required,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_tier: formData.min_tier === 'none' ? null : formData.min_tier,
      is_active: formData.is_active,
    };

    if (isCreating) {
      const { error } = await supabase
        .from('loyalty_rewards')
        .insert(rewardData);

      if (error) {
        toast.error('Failed to create reward');
        console.error(error);
      } else {
        toast.success('Reward created successfully');
        fetchRewards();
        cancelEditing();
      }
    } else if (editingId) {
      const { error } = await supabase
        .from('loyalty_rewards')
        .update(rewardData)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update reward');
        console.error(error);
      } else {
        toast.success('Reward updated successfully');
        fetchRewards();
        cancelEditing();
      }
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog.reward) return;

    const { error } = await supabase
      .from('loyalty_rewards')
      .delete()
      .eq('id', deleteDialog.reward.id);

    if (error) {
      toast.error('Failed to delete reward');
      console.error(error);
    } else {
      toast.success('Reward deleted successfully');
      fetchRewards();
    }

    setDeleteDialog({ open: false, reward: null });
  };

  const toggleActive = async (reward: LoyaltyReward) => {
    const { error } = await supabase
      .from('loyalty_rewards')
      .update({ is_active: !reward.is_active })
      .eq('id', reward.id);

    if (error) {
      toast.error('Failed to update reward');
    } else {
      fetchRewards();
    }
  };

  const getTierBadge = (minTier: string | null) => {
    if (!minTier) return null;
    const tier = tierOptions.find(t => t.value === minTier);
    if (!tier || !tier.icon) return null;
    const TierIcon = tier.icon;
    return (
      <span className={`flex items-center gap-1 text-xs ${tier.color}`}>
        <TierIcon className="w-3 h-3" />
        {tier.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
<div className="pt-32 pb-16 container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
<main className="pt-24 pb-24">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-3xl tracking-wider">LOYALTY REWARDS</h1>
                  <p className="text-muted-foreground mt-1">Manage rewards for the loyalty program</p>
                </div>
                <Button 
                  onClick={() => { setIsCreating(true); resetForm(); setEditingId(null); }}
                  disabled={isCreating || editingId !== null}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  ADD REWARD
                </Button>
              </div>
            </motion.div>

            {/* Create/Edit Form */}
            {(isCreating || editingId) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-accent bg-accent/5 p-6 mb-6"
              >
                <h2 className="font-display text-lg tracking-wider mb-4">
                  {isCreating ? 'CREATE NEW REWARD' : 'EDIT REWARD'}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs tracking-widest">NAME</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., 10% Off"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs tracking-widest">POINTS REQUIRED</Label>
                    <Input
                      type="number"
                      value={formData.points_required}
                      onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs tracking-widest">DESCRIPTION</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the reward..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs tracking-widest">DISCOUNT TYPE</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(v) => setFormData({ ...formData, discount_type: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (CHF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs tracking-widest">
                      DISCOUNT VALUE ({formData.discount_type === 'percentage' ? '%' : 'CHF'})
                    </Label>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      min={0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs tracking-widest">MINIMUM TIER</Label>
                    <Select
                      value={formData.min_tier}
                      onValueChange={(v) => setFormData({ ...formData, min_tier: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tierOptions.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            <span className="flex items-center gap-2">
                              {tier.icon && <tier.icon className={`w-4 h-4 ${tier.color}`} />}
                              {tier.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isCreating ? 'CREATE' : 'SAVE'}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing}>
                    <X className="w-4 h-4 mr-2" />
                    CANCEL
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Rewards List */}
            <div className="space-y-4">
              {rewards.map((reward) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`border-2 p-5 transition-all ${
                    !reward.is_active ? 'border-border opacity-60' : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Gift className="w-5 h-5 text-accent" />
                        <h3 className="font-display tracking-wider">{reward.name.toUpperCase()}</h3>
                        {getTierBadge(reward.min_tier)}
                        {!reward.is_active && (
                          <span className="text-xs text-muted-foreground border border-border px-2 py-0.5">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      {reward.description && (
                        <p className="text-sm text-muted-foreground mb-2">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-accent font-display">{reward.points_required} PTS</span>
                        <span className="text-muted-foreground">
                          {reward.discount_type === 'percentage' 
                            ? `${reward.discount_value}% off` 
                            : `CHF ${reward.discount_value} off`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(reward)}
                        title={reward.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Check className={`w-4 h-4 ${reward.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(reward)}
                        disabled={isCreating || editingId !== null}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, reward })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {rewards.length === 0 && (
                <div className="border-2 border-dashed border-border p-12 text-center">
                  <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground tracking-wider">NO REWARDS YET</p>
                  <p className="text-sm text-muted-foreground mt-2">Create your first loyalty reward</p>
                </div>
              )}
            </div>
          </div>
        </main>
{/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, reward: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reward</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteDialog.reward?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </PageTransition>
  );
}

export default function AdminLoyaltyRewards() {
  return (<AdminLoyaltyRewardsContent />
);
}