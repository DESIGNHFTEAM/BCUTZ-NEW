import { useState } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  barberId: string;
  currentDate: string;
  currentTime: string;
  onRescheduleRequested: () => void;
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export function RescheduleDialog({
  open,
  onOpenChange,
  bookingId,
  barberId,
  currentDate,
  currentTime,
  onRescheduleRequested
}: RescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const fetchAvailability = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const [{ data: blocked }, { data: booked }] = await Promise.all([
      supabase
        .from('blocked_times')
        .select('start_time, end_time')
        .eq('barber_id', barberId)
        .eq('blocked_date', dateStr),
      supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('barber_id', barberId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed'])
        .neq('id', bookingId)
    ]);

    setBlockedTimes(blocked || []);
    setExistingBookings(booked || []);
  };

  const isTimeSlotAvailable = (time: string): boolean => {
    const isBlocked = blockedTimes.some((bt) => 
      time >= bt.start_time.slice(0, 5) && time < bt.end_time.slice(0, 5)
    );
    if (isBlocked) return false;

    const isBooked = existingBookings.some((eb) => 
      time >= eb.start_time.slice(0, 5) && time < eb.end_time.slice(0, 5)
    );
    return !isBooked;
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    fetchAvailability(date);
  };

  const handleSubmit = async () => {
    if (!selectedTime) return;

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('reschedule_requests')
      .insert({
        booking_id: bookingId,
        customer_id: (await supabase.auth.getUser()).data.user?.id,
        requested_date: format(selectedDate, 'yyyy-MM-dd'),
        requested_time: selectedTime,
        status: 'pending'
      });

    if (error) {
      toast.error('Failed to submit reschedule request');
      console.error(error);
    } else {
      toast.success('Reschedule request sent! Awaiting barber approval.');
      onRescheduleRequested();
      onOpenChange(false);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Request a new date and time for your appointment. The barber will need to approve the change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current booking info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current appointment</p>
            <p className="font-medium">
              {format(new Date(currentDate), 'EEEE, MMMM d')} at {currentTime.slice(0, 5)}
            </p>
          </div>

          {/* Date Selection */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select New Date
            </p>
            <div className="grid grid-cols-4 gap-2">
              {dates.slice(0, 8).map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateChange(date)}
                  className={`py-3 border-2 text-center transition-all rounded-lg ${
                    isSameDay(date, selectedDate)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <p className="text-[10px] tracking-wider opacity-70">
                    {format(date, 'EEE').toUpperCase()}
                  </p>
                  <p className="font-display text-lg">{format(date, 'd')}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Select New Time
            </p>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                const available = isTimeSlotAvailable(time);
                return (
                  <button
                    key={time}
                    onClick={() => available && setSelectedTime(time)}
                    disabled={!available}
                    className={`py-2 border-2 text-sm transition-all rounded-lg ${
                      selectedTime === time
                        ? 'border-primary bg-primary text-primary-foreground'
                        : available
                        ? 'border-border hover:border-primary'
                        : 'border-border/50 text-muted-foreground/50 cursor-not-allowed line-through'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {selectedTime && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">New requested time</p>
              <div className="flex items-center gap-2 font-medium">
                {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTime || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Request Reschedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
