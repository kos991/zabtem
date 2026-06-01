import { useState, type ReactElement } from 'react';
import type { SnmpConnectionTestResult, SnmpProfileRecord } from '../../shared/types/snmp';

export function SnmpCollectionPage(props: {
  profiles: SnmpProfileRecord[];
  onTestConnection(profileId: string): Promise<SnmpConnectionTestResult>;
}): ReactElement {
  const [selectedProfileId, setSelectedProfileId] = useState(props.profiles[0]?.id ?? '');
  const [result, setResult] = useState<SnmpConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  async function testConnection(): Promise<void> {
    if (!selectedProfileId) {
      return;
    }

    setIsTesting(true);
    try {
      setResult(await props.onTestConnection(selectedProfileId));
    } finally {
      setIsTesting(false);
    }
  }

  if (props.profiles.length === 0) {
    return (
      <section className="panel editor-panel">
        <p className="eyebrow">SNMP</p>
        <h2>Collection setup</h2>
        <p className="muted-text">
          Create an SNMP profile in the project step before running collection checks.
        </p>
      </section>
    );
  }

  return (
    <section className="panel editor-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SNMP</p>
          <h2>Collection setup</h2>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => void testConnection()}
          disabled={isTesting}
        >
          {isTesting ? 'Testing...' : 'Test connection'}
        </button>
      </div>

      <label className="stack-field">
        <span>Profile</span>
        <select
          value={selectedProfileId}
          onChange={(event) => {
            setSelectedProfileId(event.target.value);
            setResult(null);
          }}
        >
          {props.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} - {profile.host}:{profile.port}
            </option>
          ))}
        </select>
      </label>

      {result ? (
        <div className={result.ok ? 'collection-result success' : 'collection-result error'}>
          <strong>{result.ok ? 'Connection reachable' : 'Connection failed'}</strong>
          <p>Target: {result.target}</p>
          {result.sysDescr ? <p>{result.sysDescr}</p> : null}
          {result.error ? <p>{result.error}</p> : null}
        </div>
      ) : (
        <div className="collection-result">
          <strong>Ready to test</strong>
          <p>The first check reads SNMP system description from the selected profile.</p>
        </div>
      )}
    </section>
  );
}
