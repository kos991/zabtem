import type { ReactElement } from 'react';

export function StepStatusBadge(props: {
  tone: 'idle' | 'active' | 'pending';
  children: string;
}): ReactElement {
  return (
    <span aria-hidden="true" className={`step-status step-status-${props.tone}`}>
      {props.children}
    </span>
  );
}
