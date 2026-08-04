"use client";

import { useCallback, useEffect, useState } from "react";
import { providerSettingsApi } from "@/data/providerSettingsStore";
import {
  EMPTY_SETTINGS,
  isProviderConfigComplete,
  type ProviderConfig,
  type ProviderSettings,
} from "@/data/providerSettings";
import {
  presetsFor,
  findPreset,
  type ProviderKind,
  type ProviderPreset,
} from "@/data/providerPresets";

/**
 * 供应商配置面板（浮动 dock + overlay 卡片，复刻 LearningToggle 模式）。
 *
 * 设计原则：自解释。让用户一眼看懂——
 * - 聊天必填（三贤对谈核心），每个供应商标注是否同时支持典籍检索
 * - 典籍检索可选：默认"本地 Mock（无需配置）"，想提升检索质量时再配真实嵌入
 * - 不让用户在"聊天/嵌入用什么协议"上困惑——选供应商即自动配好
 *
 * 密钥只存 localStorage，刷新保留，清浏览器即清除。
 */
export function ProviderSettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ProviderSettings>(EMPTY_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void providerSettingsApi.load().then(setSettings);
  }, []);

  const update = useCallback((kind: ProviderKind, patch: Partial<ProviderConfig>) => {
    setSettings((prev) => {
      const next = { ...prev, [kind]: { ...prev[kind], ...patch } };
      // unified 模式下改聊天供应商：若有配套 embeddingModel，自动更新嵌入的 model 与 baseUrl
      if (next.unified && kind === "chat" && patch.provider) {
        const preset = findPreset("chat", patch.provider);
        if (preset?.embeddingModel) {
          next.embedding = {
            ...next.chat,
            model: preset.embeddingModel,
            baseUrl: preset.embeddingBaseUrl ?? next.chat.baseUrl,
            protocol: "openai" as const,
          };
        }
      }
      return next;
    });
    setSaved(false);
  }, []);

  const chatReady = isProviderConfigComplete(settings.chat);
  const embedReady = settings.unified ? chatReady : isProviderConfigComplete(settings.embedding);

  // unified 模式下，保存时把聊天配置同步到嵌入（baseUrl/key 复用，model 用配套嵌入模型）
  const effectiveSettings: ProviderSettings = settings.unified
    ? (() => {
        const preset = findPreset("chat", settings.chat.provider);
        const embModel = settings.embedding.model || preset?.embeddingModel || settings.chat.model;
        const embBaseUrl = preset?.embeddingBaseUrl ?? settings.chat.baseUrl;
        return {
          ...settings,
          embedding: { ...settings.chat, model: embModel, baseUrl: embBaseUrl, protocol: "openai" as const },
        };
      })()
    : settings;

  const onSave = useCallback(async () => {
    await providerSettingsApi.save(effectiveSettings);
    setSaved(true);
  }, [effectiveSettings]);

  const onClear = useCallback(async () => {
    if (!window.confirm("确定清除所有供应商配置？清除后聊天与嵌入将回退到环境变量默认（或 mock）。")) return;
    await providerSettingsApi.clear();
    setSettings({ ...EMPTY_SETTINGS });
    setSaved(false);
  }, []);

  const toggleUnified = useCallback(() => {
    setSettings((prev) => ({ ...prev, unified: !prev.unified }));
    setSaved(false);
  }, []);

  // 当前聊天供应商是否支持嵌入（用于 unified 提示）
  const chatPreset = findPreset("chat", settings.chat.provider);
  const chatSupportsEmbed = Boolean(chatPreset?.embeddingModel);

  return (
    <>
      <div className="settings-dock">
        <button
          type="button"
          className="settings-dock-btn"
          aria-pressed={open}
          aria-expanded={open}
          aria-label="供应商配置"
          title="供应商配置：选择模型供应商、填写密钥"
          onClick={() => setOpen((v) => !v)}
        >
          <GearIcon />
        </button>
        {open ? (
          <div className="settings-panel" role="dialog" aria-label="供应商配置">
            <header className="settings-head">
              <h3>供应商配置</h3>
              <button type="button" className="settings-close" aria-label="关闭" onClick={() => setOpen(false)}>
                ✕
              </button>
            </header>

            <div className="settings-guide">
              <p>
                <strong>聊天模型</strong>必填——三贤对谈核心，没有它无法问答。
              </p>
              <p>
                <strong>典籍检索</strong>可选——让三贤能引用你上传的典籍；不配则用本地词法检索（质量一般但能用）。
              </p>
              <p className="settings-guide-note">密钥只存本机浏览器，不上传。</p>
            </div>

            <ConfigSection
              title="聊天模型"
              kind="chat"
              config={settings.chat}
              ready={chatReady}
              onChange={update}
            />

            <div className="settings-divider">
              <span>典籍检索（嵌入）</span>
            </div>

            <label className="settings-unified-toggle">
              <input
                type="checkbox"
                checked={settings.unified}
                onChange={toggleUnified}
              />
              <span>与聊天同一供应商</span>
            </label>

            {settings.unified ? (
              chatSupportsEmbed ? (
                <p className="settings-unified-hint is-ok">
                  ✓ {chatPreset?.label} 支持嵌入（模型 {chatPreset?.embeddingModel}），典籍检索将复用上方密钥。
                </p>
              ) : (
                <p className="settings-unified-hint is-warn">
                  ⚠ {chatPreset?.label} 不提供嵌入接口。典籍检索将用本地 mock（能检索，质量一般）。
                  想要真实向量检索，<button type="button" className="settings-link" onClick={toggleUnified}>取消勾选</button>另配一个支持嵌入的供应商。
                </p>
              )
            ) : (
              <ConfigSection
                title="嵌入模型"
                kind="embedding"
                config={settings.embedding}
                ready={embedReady}
                onChange={update}
              />
            )}

            <footer className="settings-actions">
              <span className="settings-status">
                {saved ? "✓ 已保存" : chatReady || embedReady ? "有未保存改动" : ""}
              </span>
              <button type="button" className="settings-clear" onClick={onClear}>
                清除
              </button>
              <button type="button" className="settings-save" onClick={onSave} disabled={saved}>
                保存
              </button>
            </footer>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** 单个供应商配置区（聊天或嵌入） */
function ConfigSection({
  title,
  kind,
  config,
  ready,
  onChange,
}: {
  title: string;
  kind: ProviderKind;
  config: ProviderConfig;
  ready: boolean;
  onChange: (kind: ProviderKind, patch: Partial<ProviderConfig>) => void;
}) {
  const presets = presetsFor(kind);
  const preset = findPreset(kind, config.provider) ?? presets[0];

  const onPresetChange = (id: string) => {
    const p = findPreset(kind, id);
    if (!p) return;
    onChange(kind, {
      provider: p.id,
      baseUrl: p.baseUrl,
      model: p.defaultModel ?? config.model,
      protocol: p.authStyle,
    });
  };

  return (
    <fieldset className={`settings-section${ready ? " is-ready" : ""}`}>
      <legend>
        {title}
        {ready ? <span className="settings-dot" aria-hidden /> : null}
      </legend>
      <label className="settings-field">
        <span>供应商</span>
        <select value={config.provider} onChange={(e) => onPresetChange(e.target.value)}>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {kind === "chat" ? (p.embeddingModel ? "（支持检索✓）" : "（仅聊天）") : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field">
        <span>Base URL</span>
        <input
          type="url"
          value={config.baseUrl}
          placeholder="https://…"
          onChange={(e) => onChange(kind, { baseUrl: e.target.value })}
        />
      </label>
      <label className="settings-field">
        <span>API Key</span>
        <input
          type="password"
          value={config.apiKey}
          placeholder="sk-…"
          autoComplete="off"
          onChange={(e) => onChange(kind, { apiKey: e.target.value })}
        />
      </label>
      <ModelPicker kind={kind} config={config} preset={preset} onChange={onChange} />
    </fieldset>
  );
}

/** 模型选择：支持「测试连接 / 拉取列表」与「手填」两种模式。
 *  点「测试连接」会调 /api/models：成功→绿色横幅「获取到 N 个模型」+填充下拉；
 *  失败→红色横幅显示具体原因（404 / 鉴权失败 / 超时等），同时回退手填。 */
function ModelPicker({
  kind,
  config,
  preset,
  onChange,
}: {
  kind: ProviderKind;
  config: ProviderConfig;
  preset: ProviderPreset;
  onChange: (kind: ProviderKind, patch: Partial<ProviderConfig>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [useManual, setUseManual] = useState(false);
  const [result, setResult] = useState<{ ok: true; count: number } | { ok: false; msg: string } | null>(null);

  const onTest = useCallback(async () => {
    if (!config.baseUrl.trim() || !config.apiKey.trim()) {
      setResult({ ok: false, msg: "请先填写 Base URL 和 API Key" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          authStyle: preset.authStyle,
        }),
      });
      const data = (await response.json()) as { models?: string[]; error?: string };
      if (data.models && data.models.length) {
        setModels(data.models);
        setUseManual(false);
        setResult({ ok: true, count: data.models.length });
        if (!config.model && data.models[0]) onChange(kind, { model: data.models[0] });
      } else {
        setUseManual(true);
        setResult({ ok: false, msg: data.error ?? "该供应商未返回模型列表，请手填" });
      }
    } catch (e) {
      setUseManual(true);
      setResult({ ok: false, msg: e instanceof Error ? e.message : "测试失败，请检查网络或配置" });
    } finally {
      setLoading(false);
    }
  }, [kind, config.baseUrl, config.apiKey, config.model, preset.authStyle, onChange]);

  return (
    <div className="settings-field">
      <div className="settings-model-head">
        <span>模型</span>
        <button
          type="button"
          className="settings-fetch"
          disabled={loading}
          onClick={onTest}
          title="测试连接并拉取可用模型列表"
        >
          {loading ? "测试中…" : "测试连接"}
        </button>
      </div>

      {result ? (
        <p className={`settings-banner${result.ok ? " is-ok" : " is-err"}`}>
          {result.ok ? `✓ 获取到 ${result.count} 个模型` : `✕ ${result.msg}`}
        </p>
      ) : null}

      <div className="settings-model-input">
        {models.length && !useManual ? (
          <>
            <select
              value={config.model}
              onChange={(e) => onChange(kind, { model: e.target.value })}
            >
              {!config.model || !models.includes(config.model) ? (
                <option value={config.model}>{config.model || "请选择"}</option>
              ) : null}
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="settings-manual-toggle"
              onClick={() => setUseManual(true)}
              title="切换为手动输入"
            >
              手填
            </button>
          </>
        ) : (
          <input
            type="text"
            value={config.model}
            placeholder={preset.defaultModel ?? "模型名"}
            onChange={(e) => onChange(kind, { model: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
