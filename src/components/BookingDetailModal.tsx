import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, Clock, MapPin, User, Phone, Mail, 
  CreditCard, MessageSquare, Star, X, Navigation
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingDetails {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_price: number;
  total_amount: number;
  platform_fee: number;
  currency: string;
  status: string;
  notes: string | null;
  customer_id: string | null;
  barber_id: string;
}

interface CustomerProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface BarberAddress {
  address: string;
  city: string;
  postal_code: string;
  country: string;
}

interface BookingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetails;
  isBarber?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-600',
  confirmed: 'bg-green-500/20 text-green-600',
  completed: 'bg-blue-500/20 text-blue-600',
  cancelled: 'bg-red-500/20 text-red-600',
  no_show: 'bg-gray-500/20 text-gray-600',
};

export function BookingDetailModal({
  open,
  onOpenChange,
  booking,
  isBarber = false
}: BookingDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [barberAddress, setBarberAddress] = useState<BarberAddress | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDetails();
    }
  }, [open, booking.id]);

  const fetchDetails = async () => {
    // Fetch customer profile if barber view
    if (isBarber && booking.customer_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', booking.customer_id)
        .single();
      setCustomer(profile);
    }

    // Fetch barber address for customer view using the secure function
    if (!isBarber) {
      const { data: address } = await supabase
        .rpc('get_barber_contact_for_booking', { p_barber_id: booking.barber_id });
      if (address && address[0]) {
        setBarberAddress(address[0]);
      }
    }

    // Fetch payment status
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('booking_id', booking.id)
      .maybeSingle();
    setPaymentStatus(payment?.status || null);

    // Fetch comments
    const { data: bookingComments } = await supabase
      .from('booking_comments')
      .select('*, profiles:user_id(full_name)')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true });
    setComments(bookingComments || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('booking_comments')
      .insert({
        booking_id: booking.id,
        user_id: user.user?.id,
        comment: newComment.trim()
      });

    if (error) {
      toast.error('Failed to add comment');
    } else {
      toast.success('Comment added');
      setNewComment('');
      fetchDetails();
    }
    setIsSubmitting(false);
  };

  const openInMaps = () => {
    if (barberAddress) {
      const query = encodeURIComponent(
        `${barberAddress.address}, ${barberAddress.postal_code} ${barberAddress.city}, ${barberAddress.country}`
      );
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <Badge className={statusColors[booking.status]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Service Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{booking.service_name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(booking.booking_date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info (for barbers) */}
          {isBarber && customer && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </h4>
              <div className="p-4 border rounded-lg space-y-2">
                <p className="font-medium">{customer.full_name || 'Guest'}</p>
                {customer.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
                  </p>
                )}
                {customer.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Address (for customers after booking) */}
          {!isBarber && barberAddress && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </h4>
              <div className="p-4 border rounded-lg">
                <p className="font-medium">{barberAddress.address}</p>
                <p className="text-sm text-muted-foreground">
                  {barberAddress.postal_code} {barberAddress.city}, {barberAddress.country}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={openInMaps}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment
            </h4>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Service</span>
                <span>{booking.currency} {booking.service_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Platform fee</span>
                <span>{booking.currency} {booking.platform_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Total</span>
                <span>{booking.currency} {booking.total_amount.toFixed(2)}</span>
              </div>
              {paymentStatus && (
                <Badge 
                  variant={paymentStatus === 'paid' ? 'default' : 'secondary'}
                  className="mt-3"
                >
                  Payment: {paymentStatus}
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-3">
              <h4 className="font-medium">Notes</h4>
              <p className="p-4 border rounded-lg text-sm">{booking.notes}</p>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments
            </h4>
            
            {comments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.profiles?.full_name || 'User'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p>{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={2}
                className="flex-1"
              />
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
