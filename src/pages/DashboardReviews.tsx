import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Search, Filter, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BarberReviewReplyDialog } from '@/components/BarberReviewReplyDialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PullToRefresh } from '@/components/PullToRefresh';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  barber_reply: string | null;
  barber_replied_at: string | null;
  created_at: string;
  customer_id: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function DashboardReviews() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterReplied, setFilterReplied] = useState<string>('all');
  const [barberProfileId, setBarberProfileId] = useState<string | null>(null);
  const [replyDialog, setReplyDialog] = useState<{
    open: boolean;
    review: Review | null;
  }>({ open: false, review: null });

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('barber'))) {
      navigate('/');
    }
  }, [user, hasRole, authLoading, navigate]);

  useEffect(() => {
    if (user && hasRole('barber')) {
      fetchBarberProfile();
    }
  }, [user, hasRole]);

  const fetchBarberProfile = async () => {
    const { data } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setBarberProfileId(data.id);
      fetchReviews(data.id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchReviews = async (barberId: string) => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        barber_reply,
        barber_replied_at,
        created_at,
        customer_id,
        profiles:customer_id (
          full_name,
          avatar_url
        )
      `)
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
    } else {
      setReviews(data as unknown as Review[]);
    }
    setIsLoading(false);
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = filterRating === 'all' || review.rating === parseInt(filterRating);
    
    const matchesReplied = 
      filterReplied === 'all' ||
      (filterReplied === 'replied' && review.barber_reply) ||
      (filterReplied === 'unreplied' && !review.barber_reply);
    
    return matchesSearch && matchesRating && matchesReplied;
  });

  const stats = {
    total: reviews.length,
    avgRating: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0',
    replied: reviews.filter(r => r.barber_reply).length,
    unreplied: reviews.filter(r => !r.barber_reply).length,
  };

  if (authLoading || !user || !hasRole('barber')) {
    return null;
  }

  const handleRefresh = useCallback(async () => {
    if (barberProfileId) await fetchReviews(barberProfileId);
  }, [barberProfileId]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <Breadcrumbs />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t('dashboardReviews.title')}</h1>
              <p className="text-muted-foreground">{t('dashboardReviews.subtitle')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.avgRating}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboardReviews.avgRating')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboardReviews.totalReviews')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.replied}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboardReviews.replied')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.unreplied}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboardReviews.awaitingReply')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t('dashboardReviews.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full md:w-40 h-12">
                <SelectValue placeholder={t('dashboardReviews.allRatings')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboardReviews.allRatings')}</SelectItem>
                <SelectItem value="5">5 {t('dashboardReviews.stars')}</SelectItem>
                <SelectItem value="4">4 {t('dashboardReviews.stars')}</SelectItem>
                <SelectItem value="3">3 {t('dashboardReviews.stars')}</SelectItem>
                <SelectItem value="2">2 {t('dashboardReviews.stars')}</SelectItem>
                <SelectItem value="1">1 {t('dashboardReviews.star')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterReplied} onValueChange={setFilterReplied}>
              <SelectTrigger className="w-full md:w-40 h-12">
                <SelectValue placeholder={t('dashboardReviews.allReviews')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboardReviews.allReviews')}</SelectItem>
                <SelectItem value="replied">{t('dashboardReviews.replied')}</SelectItem>
                <SelectItem value="unreplied">{t('dashboardReviews.unreplied')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Star className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">{t('dashboardReviews.noReviewsYet')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboardReviews.noReviewsDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-display text-xl flex-shrink-0">
                          {review.profiles?.avatar_url ? (
                            <img 
                              src={review.profiles.avatar_url} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover" 
                            />
                          ) : (
                            review.profiles?.full_name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {review.profiles?.full_name || t('dashboardReviews.anonymous')}
                                </span>
                                {review.barber_reply && (
                                  <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {t('dashboardReviews.replied')}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-4 h-4 ${
                                        i < review.rating 
                                          ? 'fill-amber-500 text-amber-500' 
                                          : 'text-muted-foreground'
                                      }`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(review.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                            
                            <Button
                              variant={review.barber_reply ? "outline" : "default"}
                              size="sm"
                              onClick={() => setReplyDialog({ open: true, review })}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {review.barber_reply ? t('dashboardReviews.editReply') : t('dashboardReviews.reply')}
                            </Button>
                          </div>
                          
                          {/* Review Content */}
                          {review.comment && (
                            <p className="text-sm mb-3">{review.comment}</p>
                          )}
                          {!review.comment && (
                            <p className="text-sm text-muted-foreground italic mb-3">
                              {t('dashboardReviews.noComment')}
                            </p>
                          )}
                          
                          {/* Barber Reply */}
                          {review.barber_reply && (
                            <div className="p-3 bg-primary/5 border-l-2 border-primary rounded-r-lg">
                              <p className="text-xs text-muted-foreground mb-1">
                                {t('dashboardReviews.yourReply')} • {format(new Date(review.barber_replied_at!), 'MMM d, yyyy')}
                              </p>
                              <p className="text-sm">{review.barber_reply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      </PullToRefresh>
{/* Reply Dialog */}
      {replyDialog.review && (
        <BarberReviewReplyDialog
          open={replyDialog.open}
          onOpenChange={(open) => setReplyDialog({ ...replyDialog, open })}
          reviewId={replyDialog.review.id}
          customerName={replyDialog.review.profiles?.full_name || 'Customer'}
          rating={replyDialog.review.rating}
          comment={replyDialog.review.comment}
          existingReply={replyDialog.review.barber_reply}
          onReplySubmitted={() => barberProfileId && fetchReviews(barberProfileId)}
        />
      )}
    </div>
  );
}
