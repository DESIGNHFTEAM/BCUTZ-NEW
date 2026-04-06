import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

interface CalendarButtonsProps {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
}

export function CalendarButtons({
  title,
  description,
  location,
  startDate,
  startTime,
  endTime,
}: CalendarButtonsProps) {
  const formatDateTimeForGoogle = (date: string, time: string) => {
    const [hours, minutes] = time.split(':');
    const dateObj = parseISO(date);
    dateObj.setHours(parseInt(hours), parseInt(minutes), 0);
    return format(dateObj, "yyyyMMdd'T'HHmmss");
  };

  const formatDateTimeForICS = (date: string, time: string) => {
    const [hours, minutes] = time.split(':');
    const dateObj = parseISO(date);
    dateObj.setHours(parseInt(hours), parseInt(minutes), 0);
    return format(dateObj, "yyyyMMdd'T'HHmmss");
  };

  const handleGoogleCalendar = () => {
    const startDateTime = formatDateTimeForGoogle(startDate, startTime);
    const endDateTime = formatDateTimeForGoogle(startDate, endTime);
    
    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.set('action', 'TEMPLATE');
    googleUrl.searchParams.set('text', title);
    googleUrl.searchParams.set('dates', `${startDateTime}/${endDateTime}`);
    googleUrl.searchParams.set('details', description);
    googleUrl.searchParams.set('location', location);
    
    window.open(googleUrl.toString(), '_blank');
  };

  const handleAppleCalendar = () => {
    const startDateTime = formatDateTimeForICS(startDate, startTime);
    const endDateTime = formatDateTimeForICS(startDate, endTime);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CUTZ//Booking//EN',
      'BEGIN:VEVENT',
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'booking.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGoogleCalendar}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Add to Google Calendar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAppleCalendar}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Add to Apple Calendar
      </Button>
    </div>
  );
}
