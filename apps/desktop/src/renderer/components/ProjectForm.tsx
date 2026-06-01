import { useState, type FormEvent, type ReactElement } from 'react';
import type { CreateProjectInput } from '../../shared/types/project';

export function ProjectForm(props: {
  onSubmit(input: CreateProjectInput): Promise<void>;
  onCancel(): void;
}): ReactElement {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [role, setRole] = useState<CreateProjectInput['role']>('access');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await props.onSubmit({ name, vendor, model, role });
  }

  return (
    <form className="panel form-panel" onSubmit={(event) => void handleSubmit(event)}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Create</p>
          <h2>New project</h2>
        </div>
        <button type="button" className="ghost-button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>

      <div className="form-grid">
        <label>
          <span>Project name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Core switch template"
          />
        </label>

        <label>
          <span>Vendor</span>
          <input
            required
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
            placeholder="H3C / Huawei / Ruijie"
          />
        </label>

        <label>
          <span>Model</span>
          <input
            required
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="S6520X / S5735 / RG-S5750C"
          />
        </label>

        <label>
          <span>Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as CreateProjectInput['role'])}
          >
            <option value="core">Core</option>
            <option value="aggregation">Aggregation</option>
            <option value="access">Access</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="primary-button">
          Create project
        </button>
      </div>
    </form>
  );
}
