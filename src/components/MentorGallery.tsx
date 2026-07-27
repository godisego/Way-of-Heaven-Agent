"use client";

import { useState, type ReactNode } from "react";
import { MENTORS, TAVERN_COPY, TAVERN_LORE, type MentorProfile } from "@/data/mentors";
import { MentorAvatar } from "./MentorAvatar";

export function MentorGallery() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);

  return (
    <section className="tavern" data-tour-id="tavern-gallery" aria-label={TAVERN_COPY.name}>
      <div className="tavern-head">
        <div className="tavern-plaque">
          <span className="tavern-plaque-mark">寮</span>
          <div>
            <h2 className="tavern-title">{TAVERN_COPY.name}</h2>
            <p className="tavern-subtitle">{TAVERN_COPY.subtitle}</p>
          </div>
        </div>
        <p className="tavern-blurb">{TAVERN_COPY.blurb}</p>
      </div>

      <div className="mentor-grid">
        {MENTORS.map((mentor) => (
          <MentorCard
            key={mentor.id}
            mentor={mentor}
            expanded={openId === mentor.id}
            onToggle={() => setOpenId((prev) => (prev === mentor.id ? null : mentor.id))}
          />
        ))}
      </div>

      <div className="lore-panel">
        <button
          type="button"
          className="lore-toggle"
          aria-expanded={loreOpen}
          onClick={() => setLoreOpen((v) => !v)}
        >
          <span>{TAVERN_LORE.name}</span>
          <span className="lore-toggle-hint">{loreOpen ? "收起" : "仪轨 · 天道"}</span>
        </button>
        {loreOpen ? (
          <div className="lore-body">
            <p className="lore-premise">{TAVERN_LORE.premise}</p>
            <div className="lore-grid">
              <div className="lore-block">
                <h4>开谈仪轨</h4>
                <ol>
                  {TAVERN_LORE.ritual.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              <div className="lore-block">
                <h4>屋规</h4>
                <ul>
                  {TAVERN_LORE.houseRules.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="lore-block">
              <h4>{TAVERN_LORE.methodology.title}</h4>
              <ul>
                {TAVERN_LORE.methodology.points.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="lore-block">
              <h4>席位</h4>
              <p>{TAVERN_LORE.seating}</p>
            </div>
            <div className="lore-block">
              <h4>如何养库</h4>
              <p>{TAVERN_LORE.howToFeed}</p>
            </div>
          </div>
        ) : null}
      </div>

      <p className="tavern-foot">头像可替换：见 docs/avatar-guide.md</p>
    </section>
  );
}

function MentorCard({
  mentor,
  expanded,
  onToggle,
}: {
  mentor: MentorProfile;
  expanded: boolean;
  onToggle: () => void;
}) {
  const callName = mentor.selfAddress.split(" / ")[0];
  return (
    <article className={`mentor-card tone-${mentor.tone}${expanded ? " is-open" : ""}`}>
      <button type="button" className="mentor-card-main" onClick={onToggle} aria-expanded={expanded}>
        <MentorAvatar mentor={mentor} size="md" />
        <div className="mentor-card-body">
          <div className="mentor-seat">{mentor.seat}</div>
          <h3 className="mentor-name">
            {callName}
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11, marginLeft: 6 }}>
              {mentor.title}
            </span>
          </h3>
          <p className="mentor-epithet">{mentor.epithet}</p>
          <div className="mentor-gift">
            <span className="mentor-gift-label">予你</span>
            <span>{mentor.gift}</span>
          </div>
          <div className="mentor-traditions">
            {mentor.traditions.map((t) => (
              <span className="mentor-tag" key={t.key}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <span className="mentor-expand-hint">{expanded ? "收" : "展"}</span>
      </button>

      {expanded ? (
        <div className="mentor-detail">
          <DetailBlock title="自称 / 称呼">
            <p>
              自称：{mentor.selfAddress}
              <br />
              称你：{mentor.addressUserAs}
            </p>
          </DetailBlock>
          <DetailBlock title="口头禅">
            <ul className="mentor-list">
              {mentor.catchphrases.map((c) => (
                <li key={c}>「{c}」</li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="性格">
            <ul className="mentor-list-inline">
              {mentor.personality.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="怎么给建议">
            <p>{mentor.adviceStyle}</p>
          </DetailBlock>
          <DetailBlock title="专库">
            <ul className="mentor-list">
              {mentor.traditions.map((t) => (
                <li key={t.key}>
                  <strong>{t.label}</strong>
                  <code>{t.key}</code>
                </li>
              ))}
            </ul>
          </DetailBlock>
          <DetailBlock title="边界">
            <p>{mentor.boundaries}</p>
          </DetailBlock>
        </div>
      ) : null}
    </article>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mentor-detail-block">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
