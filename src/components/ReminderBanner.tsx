import React, { useEffect, useState } from 'react';
import { Bell, Clock, Check, X, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { IdeaItem, Reminder } from '../types';
import { playReminderChime } from '../services/soundService';

interface ReminderBannerProps {
  ideas: IdeaItem[];
  onOpenIdea: (idea: IdeaItem) => void;
  onUpdateIdea: (updated: IdeaItem) => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  ideas,
  onOpenIdea,
  onUpdateIdea,
}) => {
  const [activeDueReminders, setActiveDueReminders] = useState<{ idea: IdeaItem; reminder: Reminder }[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    // Check reminders on mount and every 10 seconds
    const checkReminders = () => {
      const now = new Date().getTime();
      const dueList: { idea: IdeaItem; reminder: Reminder }[] = [];

      ideas.forEach((idea) => {
        const allReminders = idea.reminders || (idea.reminder ? [idea.reminder] : []);
        allReminders.forEach(rem => {
          if (!rem.isCompleted && !dismissedIds.includes(rem.id)) {
            const reminderTime = new Date(rem.dateTime).getTime();
            if (reminderTime <= now) {
              dueList.push({ idea, reminder: rem });
            }
          }
        });
      });

      if (dueList.length > 0 && dueList.length !== activeDueReminders.length) {
        playReminderChime();
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⏰ Hatırlatıcı: ${dueList[0].idea.title}`, {
              body: dueList[0].reminder.note || 'Bu fikir için belirlediğiniz hatırlatma zamanı geldi!',
              icon: '/favicon.ico',
            });
          } catch (e) {
            console.warn('System notification error:', e);
          }
        }
      }

      setActiveDueReminders(dueList);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [ideas, dismissedIds]);

  const handleComplete = (idea: IdeaItem, reminderId: string) => {
    const updatedReminders = (idea.reminders || (idea.reminder ? [idea.reminder] : [])).map(r => 
      r.id === reminderId ? { ...r, isCompleted: true } : r
    );
    const updated: IdeaItem = {
      ...idea,
      reminders: updatedReminders,
      reminder: undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdateIdea(updated);
    setDismissedIds((prev) => [...prev, reminderId]);
  };

  const handleSnooze = (idea: IdeaItem, reminderId: string, hours: number) => {
    const newDate = new Date(Date.now() + hours * 3600000).toISOString().slice(0, 16);
    const updatedReminders = (idea.reminders || (idea.reminder ? [idea.reminder] : [])).map(r => 
      r.id === reminderId ? { ...r, dateTime: newDate, notified: false } : r
    );
    const updated: IdeaItem = {
      ...idea,
      reminders: updatedReminders,
      reminder: undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdateIdea(updated);
    setDismissedIds((prev) => [...prev, reminderId]);
  };

  const handleDismiss = (reminderId: string) => {
    setDismissedIds((prev) => [...prev, reminderId]);
  };

  if (activeDueReminders.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full space-y-3 pointer-events-none">
      {activeDueReminders.slice(0, 3).map(({ idea, reminder }) => (
        <div
          key={reminder.id}
          className="pointer-events-auto p-4 bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 text-slate-100 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    ⏰ Zamanı Geldi!
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(reminder.dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1">
                  {idea.title}
                </h4>
                {reminder.note && (
                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {reminder.note}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(reminder.id)}
              className="text-slate-500 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
            <button
              onClick={() => onOpenIdea(idea)}
              className="text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Projeyi Aç</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSnooze(idea, reminder.id, 24)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium text-[11px] cursor-pointer"
                title="24 saat sonraya ertele"
              >
                +1 Gün Ertele
              </button>
              <button
                onClick={() => handleComplete(idea, reminder.id)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Tamamlandı</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
