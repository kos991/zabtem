import type { ReactElement } from 'react';
import { EmptyStepState } from '../components/EmptyStepState';

export function StepPlaceholderPage(props: {
  label: string;
}): ReactElement {
  return <EmptyStepState title={props.label} body="This workflow step is not wired yet." />;
}
