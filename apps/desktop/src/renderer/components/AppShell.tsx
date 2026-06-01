import type { ReactElement, ReactNode } from 'react';
import type { ContextTab, WorkflowStep } from '../state/app-state';
import { ContextPanel } from './ContextPanel';
import { TopBar } from './TopBar';
import { WorkflowSidebar } from './WorkflowSidebar';

export function AppShell(props: {
  currentStep: WorkflowStep;
  projectName?: string;
  title: string;
  description: string;
  version: string;
  activeContextTab: ContextTab;
  onStepSelect(step: WorkflowStep): void;
  onContextTabChange(tab: ContextTab): void;
  main: ReactNode;
  properties: ReactNode;
  guide: ReactNode;
  logs: ReactNode;
  actions?: ReactNode;
}): ReactElement {
  return (
    <main className="desktop-shell">
      <WorkflowSidebar
        currentStep={props.currentStep}
        projectName={props.projectName}
        onSelect={props.onStepSelect}
      />

      <section className="desktop-shell-main">
        <TopBar
          title={props.title}
          description={props.description}
          version={props.version}
          actions={props.actions}
        />
        <div className="desktop-shell-content">{props.main}</div>
      </section>

      <ContextPanel
        activeTab={props.activeContextTab}
        onTabChange={props.onContextTabChange}
        properties={props.properties}
        guide={props.guide}
        logs={props.logs}
      />
    </main>
  );
}
