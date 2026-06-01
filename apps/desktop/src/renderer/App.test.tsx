// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const snmpCollectionLabel = 'SNMP \u91c7\u96c6';

beforeEach(() => {
  window.zabtem = {
    app: {
      getVersion: vi.fn().mockResolvedValue('0.0.0')
    },
    projects: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn()
    },
    snmpProfiles: {
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      remove: vi.fn()
    }
  };
});

describe('App shell', () => {
  it('renders the recent-project home and allows switching to another workflow step', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Recent projects');
    await user.click(screen.getByRole('button', { name: snmpCollectionLabel }));

    expect(screen.getByText(snmpCollectionLabel)).toBeInTheDocument();
    expect(screen.getByText('This workflow step is not wired yet.')).toBeInTheDocument();
  });
});
