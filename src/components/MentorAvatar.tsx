"use client";

import { useState } from "react";
import type { MentorProfile } from "@/data/mentors";

type Props = {
  mentor?: Pick<MentorProfile, "shortName" | "seal" | "avatar" | "avatarColor" | "tone"> | null;
  /** 问者 */
  guest?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * 角色头像：优先本地图片，失败则回退印文色块。
 */
export function MentorAvatar({ mentor, guest, size = "md", className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const dim = size === "sm" ? 36 : size === "lg" ? 72 : 48;
  const src = guest ? "/avatars/guest.svg" : mentor?.avatar;
  const label = guest ? "问" : mentor?.seal ?? "·";
  const color = guest ? "#c2ad90" : mentor?.avatarColor ?? "#6b5a48";
  const tone = guest ? "guest" : mentor?.tone ?? "ink";

  return (
    <span
      className={`mentor-avatar size-${size} tone-${tone} ${className}`.trim()}
      style={{ width: dim, height: dim, ["--avatar-fallback" as string]: color }}
      title={guest ? "问者" : mentor?.shortName}
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={guest ? "问者" : mentor?.shortName ?? ""} onError={() => setBroken(true)} />
      ) : (
        <span className="mentor-avatar-fallback">{label}</span>
      )}
    </span>
  );
}
