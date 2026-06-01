import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import type { SaveSnmpProfileInput, SnmpProfileRecord } from '../../shared/types/snmp';

function createDefaultInput(projectId: string): SaveSnmpProfileInput {
  return {
    projectId,
    name: 'Default profile',
    host: '',
    port: 161,
    version: 'v2c',
    community: '',
    v3User: '',
    v3SecurityLevel: 'noAuthNoPriv',
    v3AuthProtocol: 'SHA',
    v3AuthPassword: '',
    v3PrivProtocol: 'AES',
    v3PrivPassword: '',
    timeoutMs: 3000,
    retries: 1,
    bulkSize: 10
  };
}

function mapProfileToInput(profile: SnmpProfileRecord): SaveSnmpProfileInput {
  return {
    id: profile.id,
    projectId: profile.projectId,
    name: profile.name,
    host: profile.host,
    port: profile.port,
    version: profile.version,
    community: profile.community,
    v3User: profile.v3User,
    v3SecurityLevel: profile.v3SecurityLevel,
    v3AuthProtocol: profile.v3AuthProtocol,
    v3AuthPassword: profile.v3AuthPassword,
    v3PrivProtocol: profile.v3PrivProtocol,
    v3PrivPassword: profile.v3PrivPassword,
    timeoutMs: profile.timeoutMs,
    retries: profile.retries,
    bulkSize: profile.bulkSize
  };
}

export function SnmpProfileForm(props: {
  projectId: string;
  profiles: SnmpProfileRecord[];
  onSave(input: SaveSnmpProfileInput): Promise<void>;
  onDelete(profileId: string): Promise<void>;
}): ReactElement {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [form, setForm] = useState<SaveSnmpProfileInput>(() => createDefaultInput(props.projectId));

  useEffect(() => {
    if (props.profiles.length === 0) {
      setSelectedProfileId('');
      setForm(createDefaultInput(props.projectId));
      return;
    }

    const selected =
      props.profiles.find((profile) => profile.id === selectedProfileId) ?? props.profiles[0];

    setSelectedProfileId(selected.id);
    setForm(mapProfileToInput(selected));
  }, [props.projectId, props.profiles, selectedProfileId]);

  function patch<K extends keyof SaveSnmpProfileInput>(key: K, value: SaveSnmpProfileInput[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await props.onSave(form);
  }

  async function handleDelete(): Promise<void> {
    if (!selectedProfileId) {
      return;
    }

    await props.onDelete(selectedProfileId);
  }

  return (
    <section className="panel form-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SNMP</p>
          <h2>Profile management</h2>
        </div>
        <div className="inline-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setSelectedProfileId('');
              setForm(createDefaultInput(props.projectId));
            }}
          >
            New profile
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => void handleDelete()}
            disabled={!selectedProfileId}
          >
            Delete
          </button>
        </div>
      </div>

      {props.profiles.length > 0 ? (
        <label className="stack-field">
          <span>Existing profiles</span>
          <select
            value={selectedProfileId}
            onChange={(event) => {
              const profile = props.profiles.find((item) => item.id === event.target.value);
              if (!profile) {
                return;
              }

              setSelectedProfileId(profile.id);
              setForm(mapProfileToInput(profile));
            }}
          >
            {props.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <form className="profile-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-grid">
          <label>
            <span>Profile name</span>
            <input
              required
              value={form.name}
              onChange={(event) => patch('name', event.target.value)}
            />
          </label>

          <label>
            <span>Host / IP</span>
            <input
              required
              value={form.host}
              onChange={(event) => patch('host', event.target.value)}
              placeholder="192.0.2.10"
            />
          </label>

          <label>
            <span>Port</span>
            <input
              required
              min={1}
              type="number"
              value={form.port}
              onChange={(event) => patch('port', Number(event.target.value))}
            />
          </label>

          <label>
            <span>Version</span>
            <select
              value={form.version}
              onChange={(event) => patch('version', event.target.value as SaveSnmpProfileInput['version'])}
            >
              <option value="v2c">SNMP v2c</option>
              <option value="v3">SNMP v3</option>
            </select>
          </label>

          {form.version === 'v2c' ? (
            <label className="span-2">
              <span>Community</span>
              <input
                value={form.community}
                onChange={(event) => patch('community', event.target.value)}
              />
            </label>
          ) : (
            <>
              <label>
                <span>v3 user</span>
                <input
                  value={form.v3User}
                  onChange={(event) => patch('v3User', event.target.value)}
                />
              </label>

              <label>
                <span>Security level</span>
                <select
                  value={form.v3SecurityLevel}
                  onChange={(event) =>
                    patch(
                      'v3SecurityLevel',
                      event.target.value as SaveSnmpProfileInput['v3SecurityLevel']
                    )
                  }
                >
                  <option value="noAuthNoPriv">noAuthNoPriv</option>
                  <option value="authNoPriv">authNoPriv</option>
                  <option value="authPriv">authPriv</option>
                </select>
              </label>

              <label>
                <span>Auth protocol</span>
                <select
                  value={form.v3AuthProtocol}
                  onChange={(event) =>
                    patch(
                      'v3AuthProtocol',
                      event.target.value as SaveSnmpProfileInput['v3AuthProtocol']
                    )
                  }
                >
                  <option value="SHA">SHA</option>
                  <option value="MD5">MD5</option>
                </select>
              </label>

              <label>
                <span>Auth password</span>
                <input
                  type="password"
                  value={form.v3AuthPassword}
                  onChange={(event) => patch('v3AuthPassword', event.target.value)}
                />
              </label>

              <label>
                <span>Priv protocol</span>
                <select
                  value={form.v3PrivProtocol}
                  onChange={(event) =>
                    patch(
                      'v3PrivProtocol',
                      event.target.value as SaveSnmpProfileInput['v3PrivProtocol']
                    )
                  }
                >
                  <option value="AES">AES</option>
                  <option value="DES">DES</option>
                </select>
              </label>

              <label>
                <span>Priv password</span>
                <input
                  type="password"
                  value={form.v3PrivPassword}
                  onChange={(event) => patch('v3PrivPassword', event.target.value)}
                />
              </label>
            </>
          )}

          <label>
            <span>Timeout ms</span>
            <input
              min={100}
              type="number"
              value={form.timeoutMs}
              onChange={(event) => patch('timeoutMs', Number(event.target.value))}
            />
          </label>

          <label>
            <span>Retries</span>
            <input
              min={0}
              type="number"
              value={form.retries}
              onChange={(event) => patch('retries', Number(event.target.value))}
            />
          </label>

          <label>
            <span>Bulk size</span>
            <input
              min={1}
              type="number"
              value={form.bulkSize}
              onChange={(event) => patch('bulkSize', Number(event.target.value))}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}
