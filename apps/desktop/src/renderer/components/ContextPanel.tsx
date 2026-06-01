import type { ReactElement, ReactNode } from 'react';
import type { ContextTab } from '../state/app-state';

export function ContextPanel(props: {
  activeTab: ContextTab;
  onTabChange(tab: ContextTab): void;
  properties: ReactNode;
  guide: ReactNode;
  logs: ReactNode;
}): ReactElement {
  const tabs: Array<{ id: ContextTab; label: string }> = [
    { id: 'properties', label: '\u5c5e\u6027' },
    { id: 'guide', label: '\u8bf4\u660e' },
    { id: 'logs', label: '\u65e5\u5fd7' }
  ];

  return (
    <aside className="context-panel">
      <div className="context-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === props.activeTab ? 'context-tab active' : 'context-tab'}
            onClick={() => props.onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="context-panel-body">
        {props.activeTab === 'properties' ? props.properties : null}
        {props.activeTab === 'guide' ? props.guide : null}
        {props.activeTab === 'logs' ? props.logs : null}
      </div>
    </aside>
  );
}
