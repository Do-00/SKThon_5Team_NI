import type { Metadata } from "next";
import { Card, Icon, Switch } from "../../../components/ui";
import { getUserAccount } from "../../../data/account";
import { MypageShell } from "../_components/MypageShell";
import { LogoutButton } from "../_components/LogoutButton";

export const metadata: Metadata = {
  title: "계정 설정",
};

export default async function MypageAccountPage() {
  const account = await getUserAccount();

  return (
    <MypageShell active="account" title="계정 설정" description="계정 정보와 알림 수신 설정을 관리하세요.">
      <Card>
        <div className="flex items-center gap-[var(--space-2)]">
          <Icon name="user" size={20} />
          <h2 className="eco-subhead text-[var(--text-strong)]">기본 정보</h2>
        </div>
        <dl className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
          <div className="flex items-center justify-between gap-[var(--space-4)] border-b border-[var(--border-subtle)] pb-[var(--space-3)]">
            <dt className="text-[length:var(--text-body-size)] text-[var(--text-muted)]">이름</dt>
            <dd className="font-bold text-[var(--text-strong)]">{account.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-[var(--space-4)] border-b border-[var(--border-subtle)] pb-[var(--space-3)]">
            <dt className="text-[length:var(--text-body-size)] text-[var(--text-muted)]">이메일</dt>
            <dd className="font-bold text-[var(--text-strong)]">{account.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-[var(--space-4)]">
            <dt className="text-[length:var(--text-body-size)] text-[var(--text-muted)]">회원 ID</dt>
            <dd className="font-mono text-[length:var(--text-caption-size)] text-[var(--text-muted)]">{account.id}</dd>
          </div>
        </dl>
        <p className="mt-[var(--space-4)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          이 프로토타입에서는 정보 수정 기능이 제공되지 않습니다. 값은 목업 데이터에 고정되어 있습니다.
        </p>
      </Card>

      <Card>
        <h2 className="eco-subhead text-[var(--text-strong)]">알림 수신 설정</h2>
        <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          화면 데모용 토글이며, 실제로 알림 수신 여부를 저장하지 않습니다.
        </p>
        <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-4)]">
          <Switch
            name="notify-application"
            defaultChecked
            label="지원사업 신청 처리 알림"
            description="신청한 지원사업의 심사 결과를 알려드립니다."
          />
          <Switch
            name="notify-grade"
            defaultChecked
            label="건물 등급 갱신 알림"
            description="저장한 건물의 에너지효율등급이 갱신되면 알려드립니다."
          />
          <Switch
            name="notify-marketing"
            label="새로운 지원사업 소식"
            description="관심 지역에 새로운 지원사업이 열리면 알려드립니다."
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="eco-subhead text-[var(--text-strong)]">로그아웃</h2>
          <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
            이 기기에서 로그아웃하고 로그인 화면으로 이동합니다.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <LogoutButton />
        </div>
      </Card>
    </MypageShell>
  );
}
