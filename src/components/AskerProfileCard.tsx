"use client";

import { useEffect, useState } from "react";
import type { UserProfile, Gender } from "@/data/userProfile";
import { isProfileComplete } from "@/data/userProfile";
import { calculateBazi, findDaYunForYear, shiShenOfGan } from "@/core/user/baziCalculator";
import { MingliPanel } from "./MingliPanel";
import type { MingliSelection } from "@/core/mingli/explainChart";
import { currentLiuNian } from "@/core/mingli/liuNian";
import { CITY_COORDS, findCityLongitude } from "@/core/user/cityCoords";
import { userProfileApi } from "@/data/userProfileStore";

type Draft = Omit<UserProfile, "updatedAt" | "bazi">;

const EMPTY_DRAFT: Draft = {
  birthDate: "",
  birthTime: "",
  birthPlace: "",
  currentPlace: "",
  gender: "male",
  education: "",
  work: "",
  relationship: "",
};

export function AskerProfileCard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await userProfileApi.load();
      if (!alive) return;
      if (saved) {
        let next = saved;
        // 旧档自动迁移：排盘结构升级（qiYun 精确到年月日等）后，静默重排一次并回存
        const stale =
          isProfileComplete(saved) &&
          (typeof (saved.bazi?.qiYun as { display?: unknown } | undefined)?.display !== "string" ||
            !Array.isArray(saved.bazi?.bazi?.year?.xunKong));
        if (stale) {
          try {
            next = {
              ...saved,
              bazi: calculateBazi({
                birthDate: saved.birthDate,
                birthTime: saved.birthTime,
                gender: saved.gender,
                birthLongitude: saved.birthLongitude,
              }),
              updatedAt: new Date().toISOString(),
            };
            await userProfileApi.save(next);
          } catch {
            next = saved;
          }
        }
        setProfile(next);
        setDraft(stripMeta(next));
      } else {
        setEditing(true);
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!draft.birthDate || !draft.birthTime || !draft.birthPlace || !draft.currentPlace) {
      setError("出生日期 / 时间 / 出生地 / 现居地 都是必填。");
      return;
    }
    // 如果用户没填经度但选了出生地，尝试查表
    let longitude = draft.birthLongitude;
    if (longitude === undefined && draft.birthPlace) {
      longitude = findCityLongitude(draft.birthPlace);
    }
    let bazi;
    try {
      bazi = calculateBazi({
        birthDate: draft.birthDate,
        birthTime: draft.birthTime,
        gender: draft.gender,
        birthLongitude: longitude,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "排盘失败");
      return;
    }
    const next: UserProfile = {
      ...draft,
      birthLongitude: longitude,
      bazi,
      updatedAt: new Date().toISOString(),
    };
    await userProfileApi.save(next);
    setProfile(next);
    setEditing(false);
  }

  async function onClear() {
    if (!confirm("确定清空问者档？清空后老胡/李/玄 看不到你的生辰背景。")) return;
    await userProfileApi.clear();
    setProfile(null);
    setDraft(EMPTY_DRAFT);
    setEditing(true);
  }

  if (!ready) return <p className="asker-loading">读档中…</p>;

  return (
    <section className="asker-card" data-tour-id="asker-profile">
      <header className="asker-card-head">
        <h3>问者档</h3>
        {isProfileComplete(profile) && !editing ? (
          <button type="button" className="asker-link" onClick={() => setEditing(true)}>
            改档
          </button>
        ) : null}
      </header>

      {isProfileComplete(profile) && !editing ? (
        <ProfileSummary profile={profile} onClear={onClear} />
      ) : (
        <ProfileForm
          draft={draft}
          onChange={update}
          onSubmit={onSubmit}
          onCancel={
            isProfileComplete(profile)
              ? () => {
                  setDraft(stripMeta(profile));
                  setEditing(false);
                  setError("");
                }
              : undefined
          }
          error={error}
        />
      )}
    </section>
  );
}

function ProfileForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  error,
}: {
  draft: Draft;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  error: string;
}) {
  return (
    <form className="asker-form" onSubmit={onSubmit}>
      <div className="asker-row">
        <label>
          <span>出生日期 <em>必填</em></span>
          <input
            type="date"
            value={draft.birthDate}
            onChange={(e) => onChange("birthDate", e.target.value)}
            required
          />
        </label>
        <label>
          <span>出生时间 <em>必填</em></span>
          <input
            type="time"
            value={draft.birthTime}
            onChange={(e) => onChange("birthTime", e.target.value)}
            required
          />
        </label>
      </div>
      <label>
        <span>出生地 <em>必填（选城市自动填经度做真太阳时校正）</em></span>
        <select
          value={
            draft.birthPlace && CITY_COORDS.find((c) => c.name === draft.birthPlace)
              ? draft.birthPlace
              : draft.birthPlace
                ? "__custom__"
                : ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              onChange("birthPlace", draft.birthPlace || "");
            } else {
              onChange("birthPlace", v);
              const city = CITY_COORDS.find((c) => c.name === v);
              if (city) onChange("birthLongitude", city.longitude);
            }
          }}
          required
        >
          <option value="" disabled>—— 选城市 ——</option>
          {CITY_COORDS.map((c) => (
            <option key={`${c.name}-${c.province}-${c.longitude}`} value={c.name}>
              {c.name}（{c.province} · 东经 {c.longitude}°）
            </option>
          ))}
          <option value="__custom__">自定义（手动填经度）</option>
        </select>
        {draft.birthPlace && !CITY_COORDS.find((c) => c.name === draft.birthPlace) ? (
          <input
            type="text"
            placeholder="城市 / 省市（如：浙江杭州）"
            value={draft.birthPlace}
            onChange={(e) => onChange("birthPlace", e.target.value)}
            style={{ marginTop: 4 }}
          />
        ) : null}
      </label>
      <label>
        <span>经度（东经，度） <em>选填</em></span>
        <input
          type="number"
          step="0.1"
          min="60"
          max="150"
          placeholder="如：116.4（选城市已自动填）"
          value={draft.birthLongitude ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange("birthLongitude", v === "" ? undefined : Number(v));
          }}
        />
      </label>
      <label>
        <span>现居地 <em>必填</em></span>
        <input
          type="text"
          placeholder="如：北京海淀"
          value={draft.currentPlace}
          onChange={(e) => onChange("currentPlace", e.target.value)}
          required
        />
      </label>
      <fieldset className="asker-gender">
        <legend>性别 <em>必填（定大运顺逆）</em></legend>
        <label>
          <input
            type="radio"
            name="gender"
            checked={draft.gender === "male"}
            onChange={() => onChange("gender", "male" satisfies Gender)}
          />
          <span>男</span>
        </label>
        <label>
          <input
            type="radio"
            name="gender"
            checked={draft.gender === "female"}
            onChange={() => onChange("gender", "female" satisfies Gender)}
          />
          <span>女</span>
        </label>
      </fieldset>

      <details className="asker-extra">
        <summary>选填 · 学历 / 工作 / 感情</summary>
        <label>
          <span>学历</span>
          <input
            type="text"
            placeholder="如：本科 / 北大 CS / 在读硕士"
            value={draft.education ?? ""}
            onChange={(e) => onChange("education", e.target.value)}
          />
        </label>
        <label>
          <span>工作</span>
          <input
            type="text"
            placeholder="如：前端开发 @ 某厂 / 自由职业 / 待业"
            value={draft.work ?? ""}
            onChange={(e) => onChange("work", e.target.value)}
          />
        </label>
        <label>
          <span>感情</span>
          <input
            type="text"
            placeholder="如：单身 / 恋爱中 / 已婚 / 离异"
            value={draft.relationship ?? ""}
            onChange={(e) => onChange("relationship", e.target.value)}
          />
        </label>
      </details>

      {error ? <p className="asker-error">{error}</p> : null}

      <div className="asker-actions">
        <button type="submit" className="asker-submit">建档 / 排盘</button>
        {onCancel ? (
          <button type="button" className="asker-cancel" onClick={onCancel}>
            取消
          </button>
        ) : null}
      </div>
      <p className="asker-hint">排盘仅作人格参考，agent 不会替你定命。</p>
    </form>
  );
}

function ProfileSummary({ profile, onClear }: { profile: UserProfile; onClear: () => void }) {
  const b = profile.bazi;
  const [sel, setSel] = useState<MingliSelection | null>(null);
  const currentDaYun = b ? findDaYunForYear(b.daYun) : null;
  // 旧档（结构升级前保存）没有 qiYun.display，等迁移/改档后才开放点击释义
  const chartReady = Boolean(b && typeof b.qiYun?.display === "string");
  const ln = currentLiuNian();
  const lnShiShen = b ? shiShenOfGan(b.dayMaster, ln.ganZhi[0]) : "";

  return (
    <div className="asker-summary">
      <div className="asker-row-meta">
        <span>生于 {profile.birthDate} {profile.birthTime}{profile.birthLongitude ? `（东经 ${profile.birthLongitude}°）` : ""}</span>
        <span>{profile.birthPlace} → {profile.currentPlace}</span>
        {b && b.solar.deltaMinutes !== 0 ? (
          <span className="asker-solar-time" data-tip="真太阳时 = 北京时间 + 经度校正 + 均时差。点击流年/柱位可看详细释义。">
            真太阳时 {b.solar.correctedTime}（{b.solar.deltaMinutes > 0 ? "+" : ""}{b.solar.deltaMinutes} 分钟{b.solar.dayShift !== 0 ? "，跨日" : ""}）
          </span>
        ) : null}
      </div>
      {b ? (
        <div className="asker-bazi" data-tour-id="bazi-card">
          <div className="asker-bazi-pillars">
            <PillarCell which="year" gan={b.bazi.year.gan} zhi={b.bazi.year.zhi} ganWx={b.bazi.year.ganWuXing} zhiWx={b.bazi.year.zhiWuXing} sub={`年 · ${b.shengXiao}`} sel={sel} onSel={setSel} clickable={chartReady} />
            <PillarCell which="month" gan={b.bazi.month.gan} zhi={b.bazi.month.zhi} ganWx={b.bazi.month.ganWuXing} zhiWx={b.bazi.month.zhiWuXing} sub="月" sel={sel} onSel={setSel} clickable={chartReady} />
            <PillarCell which="day" gan={b.bazi.day.gan} zhi={b.bazi.day.zhi} ganWx={b.bazi.day.ganWuXing} zhiWx={b.bazi.day.zhiWuXing} sub={`日 · ${b.dayMaster} (${b.dayMasterWuXing})`} isDayMaster sel={sel} onSel={setSel} clickable={chartReady} />
            <PillarCell which="time" gan={b.bazi.time.gan} zhi={b.bazi.time.zhi} ganWx={b.bazi.time.ganWuXing} zhiWx={b.bazi.time.zhiWuXing} sub="时" sel={sel} onSel={setSel} clickable={chartReady} />
          </div>
          <div
            className={`asker-bazi-row${chartReady ? " asker-clickable" : ""}`}
            onClick={chartReady ? () => setSel({ kind: "entry", id: "wuxing-gk" }) : undefined}
          >
            <span>五行：金{b.wuXingCount.金} 木{b.wuXingCount.木} 水{b.wuXingCount.水} 火{b.wuXingCount.火} 土{b.wuXingCount.土}</span>
          </div>
          {chartReady ? (
            <div className="asker-bazi-row asker-clickable" onClick={() => setSel({ kind: "qiyun" })}>
              <span>起运：{b.qiYun.display}（虚岁 <strong>{b.qiYun.startAge}</strong> 岁上运，{b.isForward ? "顺" : "逆"}排）</span>
            </div>
          ) : null}
          {currentDaYun ? (
            <div
              className={`asker-bazi-row${chartReady ? " asker-clickable" : ""}`}
              onClick={chartReady ? () => setSel({ kind: "dayun", step: currentDaYun }) : undefined}
            >
              <span>当前大运：<strong>{currentDaYun.ganZhi}</strong>（{currentDaYun.startYear} 年起，{currentDaYun.startAge} 岁后行运）</span>
            </div>
          ) : null}
          <div
            className={`asker-bazi-row${chartReady ? " asker-clickable" : ""}`}
            onClick={chartReady ? () => setSel({ kind: "liunian", year: ln.year }) : undefined}
          >
            <span>今年流年：<strong>{ln.ganZhi}</strong>（{ln.year} 年{lnShiShen ? `，对日主为${lnShiShen}` : ""}）</span>
          </div>
          {b.xiaoYun ? (
            <div className="asker-bazi-row asker-xiaoyun">
              <span>
                小运{b.xiaoYun.direction}（从时柱起）：1岁 <strong>{b.xiaoYun.steps[0].ganZhi}</strong> ·
                2岁 <strong>{b.xiaoYun.steps[1].ganZhi}</strong> ·
                3岁 <strong>{b.xiaoYun.steps[2].ganZhi}</strong>
              </span>
            </div>
          ) : null}
          {chartReady ? (
            <button type="button" className="asker-link asker-overview" data-tour-id="overview-btn" onClick={() => setSel({ kind: "overview" })}>
              盘面总览 · 整体怎么看
            </button>
          ) : (
            <p className="asker-hint">此档保存于排盘升级前：点右上「改档」重新保存一次，即可点击盘面查看逐项释义。</p>
          )}
        </div>
      ) : null}
      {b && chartReady ? <MingliPanel chart={b} selection={sel} onSelect={setSel} /> : null}
      {(profile.education || profile.work || profile.relationship) ? (
        <ul className="asker-extra-list">
          {profile.education ? <li>学历：{profile.education}</li> : null}
          {profile.work ? <li>工作：{profile.work}</li> : null}
          {profile.relationship ? <li>感情：{profile.relationship}</li> : null}
        </ul>
      ) : null}
      <button type="button" className="asker-link asker-clear" onClick={onClear}>清空档</button>
    </div>
  );
}

const WX_CLASS: Record<string, string> = { 木: "wx-mu", 火: "wx-huo", 土: "wx-tu", 金: "wx-jin", 水: "wx-shui" };

function PillarCell({
  which, gan, zhi, ganWx, zhiWx, sub, isDayMaster, sel, onSel, clickable,
}: {
  which: "year" | "month" | "day" | "time";
  gan: string;
  zhi: string;
  ganWx?: string;
  zhiWx?: string;
  sub: string;
  isDayMaster?: boolean;
  sel: MingliSelection | null;
  onSel: (s: MingliSelection) => void;
  clickable: boolean;
}) {
  const selected = sel?.kind === "pillar" && sel.which === which;
  const cls = [isDayMaster ? "is-daymaster" : "", selected ? "is-selected" : "", clickable ? "pillar-cell" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSel({ kind: "pillar", which }) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSel({ kind: "pillar", which });
              }
            }
          : undefined
      }
      data-tip="点整柱看柱释义；单点干或支看单字释义。"
    >
      <span className="pillar-chars">
        <i
          className={`pillar-gan ${WX_CLASS[ganWx ?? ""] ?? ""}`.trim()}
          onClick={clickable ? (e) => { e.stopPropagation(); onSel({ kind: "gan", char: gan, from: which }); } : undefined}
        >{gan}</i>
        <i
          className={`pillar-zhi ${WX_CLASS[zhiWx ?? ""] ?? ""}`.trim()}
          onClick={clickable ? (e) => { e.stopPropagation(); onSel({ kind: "zhi", char: zhi, from: which }); } : undefined}
        >{zhi}</i>
      </span>
      <small>{sub}</small>
    </span>
  );
}

function stripMeta(p: UserProfile): Draft {
  return {
    birthDate: p.birthDate,
    birthTime: p.birthTime,
    birthPlace: p.birthPlace,
    currentPlace: p.currentPlace,
    gender: p.gender,
    education: p.education ?? "",
    work: p.work ?? "",
    relationship: p.relationship ?? "",
    birthLongitude: p.birthLongitude,
  };
}
