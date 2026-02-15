"use client";

import { useNotifications } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  onClose: () => void;
}

function getIcon(type: "info" | "warning" | "success" | "error") {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHour < 24) return `${diffHour}h atrás`;
  return `${diffDay}d atrás`;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, markRead, markAllRead, unreadCount } =
    useNotifications();
  const count = unreadCount();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-semibold">Notificações</span>
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              {count}
            </span>
          )}
        </div>
        {count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={markAllRead}
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            Marcar tudo como lido
          </Button>
        )}
      </div>

      <Separator />

      {/* Notifications list */}
      <ScrollArea className="max-h-80">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                  !notification.read && "bg-accent/50"
                )}
                onClick={() => markRead(notification.id)}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm leading-tight",
                      !notification.read && "font-medium"
                    )}
                  >
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
