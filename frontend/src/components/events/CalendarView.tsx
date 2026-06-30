/**
 * CalendarView — CSS Grid month/week calendar for events.
 * No external library — pure CSS Grid + date math.
 *
 * - Desktop: month view
 * - Mobile (<640px): week view
 * - Events shown as colored dots/bars using Event.color
 * - Click on event navigates to dashboard
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventList } from '@/schemas/event';
import { getColorBgClass } from '@/components/events/wizard/ColorPicker';
import { cn } from '@/lib/utils';
import { getMonthDays, getWeekDays, isToday, formatMonthYear } from '@/utils/calendarDateHelpers';

interface Props {
  events: EventList[];
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarView({ events }: Props) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640,
  );

  // Listen for resize
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      setIsMobile(window.innerWidth < 640);
    });
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get days to display
  const days = useMemo(() => {
    if (isMobile) {
      return getWeekDays(currentDate);
    }
    return getMonthDays(year, month);
  }, [year, month, currentDate, isMobile]);

  // For month view: prepend empty slots for days before the first day of month
  const firstDayOfWeek = useMemo(() => {
    if (isMobile) return 0;
    const first = new Date(year, month, 1).getDay();
    return (first + 6) % 7; // Monday = 0
  }, [year, month, isMobile]);

  // Map events to dates
  const eventsPerDay = useMemo(() => {
    const map = new Map<string, EventList[]>();
    for (const ev of events) {
      if (!ev.start_date) continue;
      const start = new Date(ev.start_date);
      const end = ev.end_date ? new Date(ev.end_date) : start;
      // Add event to each day in its range
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  // Navigation
  const goNext = () => {
    if (isMobile) {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goPrev = () => {
    if (isMobile) {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header: navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button
          onClick={goPrev}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {isMobile
              ? `${days[0].toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : formatMonthYear(new Date(year, month))}
          </h3>
          <button
            onClick={goToday}
            className="text-xs px-2 py-0.5 rounded border hover:bg-muted transition-colors"
          >
            Heute
          </button>
        </div>
        <button
          onClick={goNext}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-center border-b">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1.5 text-[10px] font-medium text-muted-foreground uppercase">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty slots before first day of month (month view only) */}
        {!isMobile &&
          Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r p-1 bg-muted/20" />
          ))}

        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const dayEvents = eventsPerDay.get(key) ?? [];
          const today = isToday(day);
          const isCurrentMonth = day.getMonth() === month;

          return (
            <div
              key={key}
              className={cn(
                'min-h-[80px] sm:min-h-[100px] border-b border-r p-1 transition-colors',
                today && 'bg-violet-50/50',
                !isCurrentMonth && !isMobile && 'bg-muted/20',
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    today && 'bg-violet-600 text-white',
                    !today && 'text-muted-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/events/app/${ev.slug}`)}
                    className={cn(
                      'w-full text-left text-[10px] px-1 py-0.5 rounded truncate font-medium text-white transition-opacity hover:opacity-80',
                      getColorBgClass(ev.color || 'blue'),
                    )}
                    title={ev.name}
                  >
                    {ev.name}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-muted-foreground pl-1">
                    +{dayEvents.length - 3} weitere
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Fill remaining cells in last row (month view) */}
        {!isMobile &&
          (() => {
            const totalCells = firstDayOfWeek + days.length;
            const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            return Array.from({ length: remaining }).map((_, i) => (
              <div key={`end-${i}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r p-1 bg-muted/20" />
            ));
          })()}
      </div>
    </div>
  );
}
