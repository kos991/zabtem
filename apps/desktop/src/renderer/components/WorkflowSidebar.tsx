import type { ReactElement } from 'react';
import type { WorkflowStep } from '../state/app-state';
import { StepStatusBadge } from './StepStatusBadge';

const items: Array<{
  step: WorkflowStep;
  label: string;
  badge?: string;
}> = [
  { step: 'projects', label: '\u9879\u76ee' },
  { step: 'snmp-collection', label: 'SNMP \u91c7\u96c6', badge: 'Next' },
  { step: 'mib-management', label: 'MIB \u7ba1\u7406' },
  { step: 'oid-matching', label: 'OID \u5339\u914d' },
  { step: 'candidate-review', label: '\u5019\u9009\u9879\u5ba1\u6838' },
  { step: 'template-preview', label: '\u6a21\u677f\u9884\u89c8' }
];

export function WorkflowSidebar(props: {
  currentStep: WorkflowStep;
  projectName?: string;
  onSelect(step: WorkflowStep): void;
}): ReactElement {
  return (
    <aside className="workflow-sidebar">
      <div className="workflow-sidebar-header">
        <p className="eyebrow">Zabtem</p>
        <strong>MIB2Zabbix Desktop</strong>
        <small>{props.projectName ?? 'Recent projects'}</small>
      </div>

      <nav className="workflow-nav" aria-label="Workflow navigation">
        {items.map((item) => (
          <button
            key={item.step}
            type="button"
            className={item.step === props.currentStep ? 'workflow-link active' : 'workflow-link'}
            onClick={() => props.onSelect(item.step)}
          >
            <span>{item.label}</span>
            {item.badge ? <StepStatusBadge tone="pending">{item.badge}</StepStatusBadge> : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
