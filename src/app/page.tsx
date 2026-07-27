import { DocumentLibrary } from "@/components/DocumentLibrary";
import { DocumentUploader } from "@/components/DocumentUploader";
import { ChatPanel } from "@/components/ChatPanel";
import { MentorGallery } from "@/components/MentorGallery";
import { LearningToggle } from "@/components/learning/LearningToggle";
import { AskerProfileCard } from "@/components/AskerProfileCard";

export default function Home() {
  return (
    <main className="shell">
      {/* 主舞台：像角色对话产品，不是后台仪表盘 */}
      <div className="shell-main">
        <ChatPanel />
      </div>

      {/* 侧栏 / 下方：问者档 + 藏书 + 角色（次要） */}
      <aside className="shell-side">
        <details className="side-block" open>
          <summary>问者档</summary>
          <div className="side-body">
            <AskerProfileCard />
          </div>
        </details>
        <details className="side-block">
          <summary>入阁藏书</summary>
          <div className="side-body">
            <DocumentUploader />
            <DocumentLibrary />
          </div>
        </details>
        <details className="side-block">
          <summary>三贤志 · 茶寮设定</summary>
          <div className="side-body">
            <MentorGallery />
          </div>
        </details>
      </aside>

      <LearningToggle />
    </main>
  );
}
