import type { Metadata } from "next";
import { Card, Icon } from "../../../components/ui";
import type { IconName } from "../../../components/ui";
import { formatDate } from "../../../lib/format";
import { MypageShell } from "../_components/MypageShell";
import { getAccountNotifications, getNotificationCategoryLabel } from "../_lib/notifications";
import type { NotificationCategory } from "../_lib/notifications";

export const metadata: Metadata = {
  title: "알림",
};

const CATEGORY_ICON: Record<NotificationCategory, IconName> = {
  application: "check",
  grade: "leaf",
  program: "building",
  account: "user",
};

export default async function MypageNotificationsPage() {
  const notifications = await getAccountNotifications();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <MypageShell
      active="notifications"
      title="알림"
      description={
        unreadCount > 0
          ? `읽지 않은 알림이 ${unreadCount}건 있습니다.`
          : "새로운 알림이 없습니다."
      }
    >
      <ul className="flex flex-col gap-[var(--space-3)]">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <Card
              className={
                notification.read
                  ? "flex gap-[var(--space-4)]"
                  : "flex gap-[var(--space-4)] border-[var(--border-brand)] bg-[var(--surface-brand-soft)]"
              }
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-card)] text-[var(--teal-700)]"
              >
                <Icon name={CATEGORY_ICON[notification.category]} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <span className="text-[length:var(--text-caption-size)] font-bold text-[var(--text-link)]">
                    {getNotificationCategoryLabel(notification.category)}
                  </span>
                  {!notification.read ? (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-[var(--status-warn)]"
                    />
                  ) : null}
                  <span className="sr-only">{notification.read ? "읽음" : "읽지 않음"}</span>
                </div>
                <h2 className="mt-[var(--space-1)] text-[length:var(--text-body-size)] font-bold text-[var(--text-strong)]">
                  {notification.title}
                </h2>
                <p className="mt-[var(--space-1)] text-[length:var(--text-body-size)] text-[var(--text-body)]">
                  {notification.body}
                </p>
                <p className="mt-[var(--space-2)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </MypageShell>
  );
}
