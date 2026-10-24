import { Badge } from "../../../components/ui";
import type { BadgeTone } from "../../../components/ui";
import type { ApplicationStatus, ProgramApplication } from "../../../data/admin";
import { formatDate } from "../../../lib/format";

export interface ApplicationsTableProps {
  applications: readonly ProgramApplication[];
  /** Accessible table name, read by screen readers via `<caption>`. */
  caption: string;
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "심사 중",
  approved: "승인 완료",
  rejected: "반려",
};

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  pending: "caution",
  approved: "good",
  rejected: "danger",
};

/**
 * Server Component — accessible support-program applications table.
 *
 * The table itself is the only element that scrolls horizontally (via
 * `overflow-x-auto` on its wrapper, not the page), so it stays usable on
 * narrow viewports without breaking the surrounding admin layout.
 */
export function ApplicationsTable({ applications, caption }: ApplicationsTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <table className="w-full min-w-[720px] border-collapse text-left text-[length:var(--text-body-size)]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
            <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
              건물명
            </th>
            <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
              지원사업명
            </th>
            <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
              신청자
            </th>
            <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
              상태
            </th>
            <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
              신청일
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
              <th scope="row" className="px-[var(--space-4)] py-[var(--space-3)] font-medium text-[var(--text-strong)]">
                {application.buildingName}
              </th>
              <td className="px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-body)]">
                {application.programName}
              </td>
              <td className="px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-body)]">
                {application.applicantName}
              </td>
              <td className="px-[var(--space-4)] py-[var(--space-3)]">
                <Badge tone={STATUS_TONE[application.status]}>{STATUS_LABEL[application.status]}</Badge>
              </td>
              <td className="whitespace-nowrap px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-muted)]">
                {formatDate(application.submittedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
