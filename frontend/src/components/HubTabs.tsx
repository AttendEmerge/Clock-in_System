interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface HubTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function HubTabs({ tabs, activeTab, onChange }: HubTabsProps) {
  return (
    <div className="flex gap-1 bg-app-border-subtle rounded-xl p-1 w-fit max-w-full overflow-x-auto border border-app-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === tab.key
              ? 'bg-app-surface shadow-sm text-app border border-app-border'
              : 'text-app-muted hover:text-app'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key
                  ? 'bg-app-nav-active-bg text-app-nav-active-text'
                  : 'bg-app-border text-app-muted'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
