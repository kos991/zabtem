import type { ReactElement, ReactNode } from 'react';

export function TopBar(props: {
  title: string;
  description: string;
  version: string;
  actions?: ReactNode;
}): ReactElement {
  return (
    <header className="top-bar">
      <div>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>

      <div className="top-bar-meta">
        <div className="runtime-pill">
          <span>Runtime</span>
          <strong>{props.version}</strong>
        </div>
        {props.actions ? <div className="top-bar-actions">{props.actions}</div> : null}
      </div>
    </header>
  );
}
