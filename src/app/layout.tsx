import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";
import "@/components/learning/learning.css";
import "@/components/settings/settings.css";
import { LearningProvider } from "@/components/learning/LearningProvider";
import { ProviderSettings } from "@/components/settings/ProviderSettings";

export const metadata: Metadata = {
  title: "天道茶寮",
  description: "老胡、李、贫道·玄三人夜场对谈；典籍可溯的天道导师。",
};

const bodyFontVars = {
  ["--font-serif"]: "'Songti SC', 'STSong', 'Noto Serif CJK SC', serif",
  ["--font-sans"]: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif",
} as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body style={bodyFontVars}>
        <LearningProvider>
          {children}
          <ProviderSettings />
        </LearningProvider>
      </body>
    </html>
  );
}
