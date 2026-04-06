import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, CheckCircle, Clock, Eye, MessageSquare,
  Search, ChevronDown, ChevronUp, Scissors
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_barber_id: string | null;
  category: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reporter_email?: string;
  reporter_name?: string;
  reported_shop_name?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-600 border-green-500/30',
  dismissed: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

function AdminReportsContent() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const categoryLabels: Record<string, string> = {
    scam: t('admin.reports.categories.scam'),
    inappropriate: t('admin.reports.categories.inappropriate'),
    fake: t('admin.reports.categories.fake'),
    spam: t('admin.reports.categories.spam'),
    other: t('admin.reports.categories.other'),
  };

  useEffect(() => {
    if (user && hasRole('admin')) {
      fetchReports();
    }
  }, [user, hasRole, filterStatus]);

  const fetchReports = async () => {
    setIsLoading(true);

    let query = supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      const enrichedReports = await Promise.all(
        (data || []).map(async (report) => {
          const { data: reporterData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', report.reporter_id)
            .single();

          let reported_shop_name = null;
          if (report.reported_barber_id) {
            const { data: barberData } = await supabase
              .from('barber_profiles')
              .select('shop_name')
              .eq('id', report.reported_barber_id)
              .single();
            reported_shop_name = barberData?.shop_name;
          }

          return {
            ...report,
            reporter_email: reporterData?.email || 'N/A',
            reporter_name: reporterData?.full_name || 'Anonymous',
            reported_shop_name,
          };
        })
      );
      setReports(enrichedReports);
    }

    setIsLoading(false);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    setIsProcessing(true);

    const updates: Record<string, any> = {};
    if (newStatus) updates.status = newStatus;
    if (adminNotes) updates.admin_notes = adminNotes;
    if (newStatus === 'resolved' || newStatus === 'dismissed') {
      updates.resolved_by = user?.id;
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', selectedReport.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('toasts.reports.updateError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('admin.reports.reportUpdated'),
        description: t('admin.reports.reportUpdatedDesc'),
      });
      fetchReports();
    }

    setIsProcessing(false);
    setSelectedReport(null);
    setAdminNotes('');
    setNewStatus('');
  };

  const filteredReports = reports.filter(
    (report) =>
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reported_shop_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
<main className="pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          <Breadcrumbs />
          
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] text-muted-foreground mb-2">{t('admin.reports.tagline')}</p>
            <h1 className="font-display text-2xl md:text-5xl font-bold tracking-wider">
              {t('admin.reports.title')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              {t('admin.reports.subtitle')}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <Input
                placeholder={t('admin.reports.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-10 md:h-12 text-sm"
              />
            </div>
            <div className="flex gap-1.5 md:gap-2 flex-wrap">
              {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                  size="sm"
                  className="capitalize text-xs md:text-sm"
                >
                  {status === 'all' ? t('admin.reports.all') : t(`admin.reports.${status}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('admin.reports.pending')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-blue-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{reports.filter(r => r.status === 'reviewing').length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('admin.reports.underReview')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{reports.filter(r => r.status === 'resolved').length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('admin.reports.resolved')}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 md:p-4 border border-border bg-card"
            >
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-primary mb-1 md:mb-2" />
              <p className="text-xl md:text-2xl font-bold">{reports.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('admin.reports.totalReports')}</p>
            </motion.div>
          </div>

          {/* Reports List */}
          {isLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 md:h-24 bg-card animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 md:py-16 border-2 border-dashed border-border rounded-lg">
              <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg md:text-xl font-medium mb-2">{t('admin.reports.noReports')}</p>
              <p className="text-sm md:text-base text-muted-foreground">
                {filterStatus === 'pending' 
                  ? t('admin.reports.noPendingReports')
                  : t('admin.reports.adjustFilters')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {filteredReports.map((report) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border bg-card overflow-hidden"
                >
                  {/* Header Row */}
                  <div 
                    className="p-3 md:p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm md:text-base truncate">{categoryLabels[report.category] || report.category}</h3>
                          <Badge variant="outline" className={`${statusColors[report.status]} text-[10px] md:text-xs`}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {t('admin.reports.by')} {report.reporter_name} • {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      {report.reported_shop_name && (
                        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                          <Scissors className="w-4 h-4" />
                          {report.reported_shop_name}
                        </div>
                      )}
                      {expandedReport === report.id ? (
                        <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedReport === report.id && (
                    <div className="border-t border-border p-4 md:p-6 space-y-4">
                      <div>
                        <h4 className="font-medium text-xs md:text-sm mb-2">{t('admin.reports.reportDescription')}</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 md:p-4 rounded">
                          {report.description}
                        </p>
                      </div>

                      {report.admin_notes && (
                        <div>
                          <h4 className="font-medium text-xs md:text-sm mb-2">{t('admin.reports.adminNotes')}</h4>
                          <p className="text-sm text-muted-foreground bg-muted p-3 md:p-4 rounded">
                            {report.admin_notes}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                        <Button
                          onClick={() => {
                            setSelectedReport(report);
                            setNewStatus(report.status);
                            setAdminNotes(report.admin_notes || '');
                          }}
                          size="sm"
                          className="text-xs md:text-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                          {t('admin.reports.updateReport')}
                        </Button>
                        {report.reported_barber_id && (
                          <Button variant="outline" size="sm" asChild className="text-xs md:text-sm">
                            <a href={`/barber/${report.reported_barber_id}`} target="_blank" rel="noopener noreferrer">
                              {t('admin.reports.viewBarberProfile')}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Update Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">{t('admin.reports.updateTitle')}</DialogTitle>
            <DialogDescription className="text-sm">
              {t('admin.reports.updateDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.reports.status')}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.reports.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('admin.reports.pending')}</SelectItem>
                  <SelectItem value="reviewing">{t('admin.reports.reviewing')}</SelectItem>
                  <SelectItem value="resolved">{t('admin.reports.resolved')}</SelectItem>
                  <SelectItem value="dismissed">{t('admin.reports.dismissed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.reports.adminNotes')}</label>
              <Textarea
                placeholder={t('admin.reports.addNotes')}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedReport(null)} className="w-full md:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateReport} disabled={isProcessing} className="w-full md:w-auto">
              {isProcessing ? t('admin.reports.saving') : t('admin.reports.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
</div>
  );
}

// RouteGuard in App.tsx enforces admin/founder role — no page-level wrapper needed.
export default function AdminReports() {
  return <AdminReportsContent />;
}
