import type { Metadata } from "next";
import { LearningLibrary } from "@/components/learning/LearningLibrary";
import styles from "@/components/learning/LearningLibrary.module.css";

export const metadata: Metadata = {
  title: "学习馆 · 天道茶寮",
  description: "从 Agent 原理、源码与评测，到八字盘面、十神、岁运和交叉速查的双学径课程",
};

/** 学习馆：两条系统课程 + Agent 术语 + 命理知识库交叉速查。 */
export default function LearnPage() {
  return (
    <main className={`learn-shell learn-home ${styles.home}`}>
      <LearningLibrary />
    </main>
  );
}
