import type { ReactElement } from 'react';

export function EmptyStepState(props: {
  title: string;
  body: string;
}): ReactElement {
  return (
    <section className="empty-step">
      <p className="eyebrow">Workflow</p>
      <h2>{props.title}</h2>
      <p>{props.body}</p>
    </section>
  );
}
