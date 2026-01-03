import { GitBranch, Palette, Sparkles } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { CustomSelect } from "../ui/CustomSelect";
import type { DiagramStyle } from "../../types";

const THEMES = [
  { value: "default", label: "Default" },
  { value: "forest", label: "Forest" },
  { value: "dark", label: "Dark" },
  { value: "neutral", label: "Neutral" },
  { value: "base", label: "Base" },
];

const CURVES = [
  { value: "basis", label: "Curved (Basis)" },
  { value: "linear", label: "Straight (Linear)" },
  { value: "step", label: "Stepped" },
  { value: "monotoneX", label: "Monotone X" },
  { value: "monotoneY", label: "Monotone Y" },
];

const BACKGROUNDS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "transparent", label: "Transparent" },
];

const PRESETS = [
  { name: "Default", style: "chen" as DiagramStyle, theme: "default", curve: "basis" },
  { name: "Dark Mode", style: "chen" as DiagramStyle, theme: "dark", curve: "basis" },
  { name: "Forest Chen", style: "chen" as DiagramStyle, theme: "forest", curve: "linear" },
  { name: "Crow's Foot Classic", style: "crows_foot" as DiagramStyle, theme: "default", curve: "basis" },
  { name: "Crow's Foot Dark", style: "crows_foot" as DiagramStyle, theme: "dark", curve: "linear" },
];

export default function DiagramSettings() {
  const { diagramSettings, setDiagramSettings, editorTabs, activeTabId, updateEditorTab } = useAppStore();
  const activeTab = editorTabs.find((t) => t.id === activeTabId);
  const isDiagramTab = activeTab?.type === "diagram";

  const handleStyleChange = (style: DiagramStyle) => {
    setDiagramSettings({ style });
    if (activeTab && isDiagramTab) {
      updateEditorTab(activeTab.id, { diagramStyle: style, isDirty: true });
    }
  };

  const handleThemeChange = (theme: string) => {
    setDiagramSettings({ theme });
    if (activeTab && isDiagramTab) {
      updateEditorTab(activeTab.id, { diagramTheme: theme, isDirty: true });
    }
  };

  const handleCurveChange = (curve: string) => {
    setDiagramSettings({ curve });
    if (activeTab && isDiagramTab) {
      updateEditorTab(activeTab.id, { diagramCurve: curve, isDirty: true });
    }
  };

  const handleBackgroundChange = (background: string) => {
    setDiagramSettings({ background });
    if (activeTab && isDiagramTab) {
      updateEditorTab(activeTab.id, { diagramBackground: background, isDirty: true });
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setDiagramSettings({
      style: preset.style,
      theme: preset.theme,
      curve: preset.curve,
    });
    if (activeTab && isDiagramTab) {
      updateEditorTab(activeTab.id, {
        diagramStyle: preset.style,
        diagramTheme: preset.theme,
        diagramCurve: preset.curve,
        isDirty: true,
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-300 truncate">
            Diagram Settings
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-6">
        {!isDiagramTab ? (
          <div className="text-center py-8">
            <GitBranch className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No diagram selected</p>
            <p className="text-xs text-zinc-600 mt-1">
              Open an ER diagram to configure settings
            </p>
          </div>
        ) : (
          <>
            {/* Diagram Style */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                <Palette className="w-3 h-3" />
                Diagram Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStyleChange("chen")}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    diagramSettings.style === "chen"
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Chen's Notation
                </button>
                <button
                  onClick={() => handleStyleChange("crows_foot")}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    diagramSettings.style === "crows_foot"
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Crow's Foot
                </button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                Theme
              </label>
              <CustomSelect
                value={diagramSettings.theme}
                onChange={handleThemeChange}
                options={THEMES}
              />
            </div>

            {/* Line Style (only for Chen) */}
            {diagramSettings.style === "chen" && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                  Line Style
                </label>
                <CustomSelect
                  value={diagramSettings.curve}
                  onChange={handleCurveChange}
                  options={CURVES}
                />
              </div>
            )}

            {/* Background */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                Background
              </label>
              <CustomSelect
                value={diagramSettings.background}
                onChange={handleBackgroundChange}
                options={BACKGROUNDS}
              />
            </div>

            {/* Presets */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                Quick Presets
              </label>
              <div className="space-y-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                      diagramSettings.style === preset.style &&
                      diagramSettings.theme === preset.theme &&
                      diagramSettings.curve === preset.curve
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/50"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-transparent"
                    }`}
                  >
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {preset.style === "chen" ? "Chen" : "Crow's"} • {preset.theme}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
