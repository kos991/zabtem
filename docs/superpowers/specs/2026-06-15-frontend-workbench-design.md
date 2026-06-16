# Zabtem Frontend Workbench Design

## Goal

Replace the placeholder renderer with a practical operations-style workbench inspired by Ant Design Pro information architecture while keeping the existing TDesign dependency stack.

## Scope

- Show Zabtem as a desktop/web workbench, not a landing page.
- Surface the current Rust API health by calling `/api/health`.
- Present the intended Zabbix template workflow: project setup, SNMP profile, collection, MIB mapping, template export.
- Make missing backend capabilities visible as planned/locked steps instead of fake working screens.
- Keep the UI responsive for desktop and tablet-width browser use.

## Layout

- Top header: brand, environment tags, API status action.
- Left sidebar: workflow navigation with current/completed/planned status indicators.
- Main content: current phase overview, health card, next action cards, recent runtime notes.
- Right aside: environment details, architecture status, and upcoming milestones.

## Behavior

- On mount, request `/api/health` and display `ok`, `checking`, or `offline` states.
- If the request fails, show an offline badge and keep the rest of the workbench usable.
- Buttons for unimplemented workflow stages remain visibly disabled/planned.

## Testing

- Renderer test verifies the workbench title, workflow items, and healthy API state render from a mocked fetch response.
- Existing lint, typecheck, test, and build commands must pass before deployment.
