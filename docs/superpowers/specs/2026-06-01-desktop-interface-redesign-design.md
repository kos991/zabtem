# Desktop Interface Redesign Design

**Date:** 2026-06-01  
**Product:** Zabtem / MIB2Zabbix Desktop  
**Scope:** Full desktop interface redesign for the first-phase workflow  
**Status:** Design approved in chat, ready for implementation planning after written review

---

## 1. Objective

Redesign the entire desktop application UI into a professional desktop-tool experience instead of a temporary skeleton or isolated page styling refresh.

The redesign must:

- Establish one coherent interface system for the whole Electron desktop app.
- Support the already implemented project management and SNMP profile workflow.
- Create a stable layout model that later phases can reuse for SNMP collection, MIB management, OID matching, candidate review, and template preview.
- Prioritize long-session usability over visual novelty.

The redesign must not:

- Change backend product scope.
- Add new business capabilities beyond what the current phase already supports.
- Turn the app into a dashboard-style “big screen”.
- Depend on a Pencil MCP tool path that is not available in the current session.

Note:

- The user originally requested using `pencil mcp` for UI work.
- In the current session, no `pencil mcp` tool endpoint is available.
- This spec therefore defines the UI system and page behavior so the redesign can be implemented directly in the repository codebase.

---

## 2. Product Positioning

The UI should feel like a professional desktop application for infrastructure engineers, not like:

- a marketing site,
- a generic admin dashboard,
- a monitoring NOC wall,
- or a loose collection of cards and modals.

The intended experience is:

- high trust,
- low ambiguity,
- controlled information density,
- predictable navigation,
- and clear expansion paths as more workflow steps become real.

The interaction model should feel closer to:

- a specialized engineering workstation,
- a network operations desktop tool,
- or a configuration-oriented IDE-like utility.

---

## 3. Information Architecture

### 3.1 Global Navigation Model

The left rail is fixed and organized by **workflow**, not by data resource type.

Navigation order:

1. `项目`
2. `SNMP 采集`
3. `MIB 管理`
4. `OID 匹配`
5. `候选项审核`
6. `模板预览`

Rationale:

- The user chose workflow-first navigation.
- The product’s real value is the end-to-end transformation flow, not isolated storage entities.
- This structure scales as more steps become active without changing the mental model.

### 3.2 Startup Entry

The app opens into a **Recent Projects** start page.

The start page is the default home because:

- the user selected it over project-overview or step-workbench home,
- it matches professional desktop software behavior,
- and it reduces friction between relaunch and resuming work.

### 3.3 Project Interior Navigation

Once a project is open, the left workflow rail stays available and is **freely navigable**.

There is no step lock or wizard gate.

If a page is not ready because prerequisite data does not exist, it should:

- remain reachable,
- show a clear empty state,
- explain what is missing,
- and point to the most relevant next action.

This keeps the navigation honest while preserving the user’s control.

---

## 4. Primary Layout System

The entire app should use one stable three-zone layout:

- **Left:** fixed workflow navigation
- **Center:** primary work surface
- **Right:** contextual side panel

### 4.1 Left Rail

The left rail should:

- remain visible at all times on desktop widths,
- contain workflow steps,
- highlight current location clearly,
- show lightweight status hints when useful,
- and avoid oversized decorative branding.

It should feel structural, not promotional.

### 4.2 Center Work Surface

The center region is the main task area.

Rules:

- It only presents the current page’s primary task.
- It does not duplicate sidebar context unnecessarily.
- It should support both list-heavy and form-heavy pages without changing the shell pattern.
- It should be the widest and most visually dominant region.

### 4.3 Right Context Panel

The right panel is a **mixed-mode contextual panel**.

The user selected a switchable right rail rather than a single-purpose property editor.

Tabs:

- `属性`
- `说明`
- `日志`

Responsibilities:

- `属性`: current object details and editable metadata when appropriate
- `说明`: step guidance, field help, status explanation, constraints
- `日志`: local event trail, save feedback, loading/error context

The right panel must assist the center region, not compete with it.

---

## 5. Visual Direction

### 5.1 Chosen Direction

The user selected:

- **professional software style**
- **cool technical color language**

Therefore the UI should use:

- a light cool-gray base,
- blue-cyan technical accents,
- restrained contrast,
- clear panel boundaries,
- and compact professional spacing.

### 5.2 Color Strategy

Base:

- cool off-white and cool gray backgrounds
- never pure sterile white for full-page surfaces

Accent:

- cyan-blue / technical blue for active and primary states

Semantic colors:

- warning: amber/orange
- danger: red
- success: green

Constraints:

- do not overuse accent color across entire surfaces,
- do not create a dark-mode-like atmosphere on a light canvas,
- and do not let “technical” drift into “sci-fi”.

### 5.3 Density and Tone

Information density should be moderate to moderately high.

This is not a sparse landing page experience. It is also not a cramped legacy enterprise UI.

The tone should be:

- precise,
- calm,
- structured,
- and operationally serious.

### 5.4 Typography

Typography should favor:

- Chinese readability,
- clear hierarchy,
- and narrow variance in display styles.

Avoid:

- oversized hero typography,
- decorative display fonts,
- or exaggerated contrast between headings and body text.

---

## 6. Core Interaction Principles

### 6.1 Predictability

Every page should share the same shell logic:

- workflow location on the left,
- task title and action zone in the center top,
- work content below,
- contextual panel on the right.

### 6.2 Functional Empty States

Empty states must explain:

- what this page is for,
- why it is empty,
- what the next action is.

They must not be decorative placeholders.

### 6.3 Desktop-Tool Feedback

Key actions should produce explicit desktop-style feedback:

- saved,
- failed,
- loading,
- deleted,
- unsaved changes,
- or no data yet.

Avoid relying on subtle UI movement alone.

### 6.4 Data-First Page Design

Later pages in this product will become table-heavy and detail-heavy.

So even this early redesign should optimize for:

- wide working surfaces,
- stable toolbars,
- clear list-detail relationships,
- and secondary panel behavior.

This prevents a future rewrite when SNMP/MIB/template pages arrive.

---

## 7. Page Designs

### 7.1 Start Page: Recent Projects

Purpose:

- resume work fast,
- create a new project,
- see recent activity at a glance.

Structure:

- top header strip with product name, app version, and short status copy
- center-left large recent project list
- right contextual panel with project summary / recent activity / quick help

Project row content:

- project name
- vendor
- model
- role
- last updated time
- last active workflow step

Primary actions:

- `新建项目`
- `打开最近项目`

Secondary actions can be added later but should not crowd the first version.

### 7.2 Project Page Shell

When a project is open:

- the same shell remains,
- the header becomes project-scoped,
- the center content changes per workflow step,
- the right panel updates to the current object or page context.

The user should never feel that they “left” the product shell when moving between steps.

### 7.3 Project Page: Current Phase

For the current implementation phase, the project interior must first support:

- project summary
- SNMP profile management

Recommended center layout:

- top: project summary strip
- main: profile list and profile editing workspace

Recommended right panel behavior:

- `属性`: currently selected project or profile fields
- `说明`: field explanations and version-specific tips
- `日志`: save events, validation outcomes, recent actions

### 7.4 Future Placeholder Pages

The redesign should include shell support for:

- `SNMP 采集`
- `MIB 管理`
- `OID 匹配`
- `候选项审核`
- `模板预览`

In this redesign increment they may still be placeholder or empty-state pages, but they should already look like real destinations in the flow rather than broken stubs.

---

## 8. Component System

The redesign should establish reusable UI building blocks for later pages.

Required foundation components:

- left workflow nav
- shell header
- recent-project row/card
- page title block
- toolbar action row
- contextual side panel with tabs
- empty-state block
- summary key-value grid
- list/detail container
- desktop-style form section
- inline status banner

These components should define the design system more than individual pages do.

---

## 9. Behavior Rules

### 9.1 Navigation Behavior

- Start page shows the workflow rail in a reduced or neutral state.
- Once a project is opened, the workflow rail becomes fully active.
- Navigation never hard-locks the user.

### 9.2 Right Panel Behavior

- The right panel is persistent on desktop.
- Tabs switch instantly without route changes.
- If a tab has no content, it shows a purposeful empty state.

### 9.3 Form Behavior

- Forms should prefer two-column layouts when width allows.
- Related fields should be grouped semantically.
- Profile editing should not feel like a raw database editor.

### 9.4 Table/List Behavior

- Lists should prioritize scanability.
- Dense pages should avoid oversized cards once real data arrives.
- Key rows should expose status without requiring detail expansion.

---

## 10. Implementation Boundaries

This redesign phase includes:

- redesigning the full application shell,
- replacing the current temporary visual style,
- integrating current pages into the new shell,
- and preparing the interface system for future flow pages.

This redesign phase excludes:

- new backend capabilities,
- SNMP runtime behavior,
- MIB parsing features,
- candidate-review business logic,
- template-generation business logic,
- and any dependency on unavailable Pencil MCP tooling.

The implementation should remain code-native in the repository.

---

## 11. Risks And Mitigations

### 11.1 Risk: Over-designing Before Workflow Pages Exist

If the shell becomes too decorative before later pages exist, the UI will feel fake.

Mitigation:

- emphasize structure and component discipline over decorative flourish.

### 11.2 Risk: Start Page and Project Page Feeling Like Different Products

Mitigation:

- use the same shell grammar and color system on both.

### 11.3 Risk: Right Panel Becoming Noise

Mitigation:

- constrain it to useful secondary context,
- keep tab content short and targeted,
- and never move the primary task out of the center.

### 11.4 Risk: Technical Color Direction Becoming “Control Room”

Mitigation:

- stay light,
- keep accents sparse,
- and favor practical hierarchy over spectacle.

---

## 12. Acceptance Criteria For The Redesign

The redesign is successful when:

1. The app has one coherent professional desktop UI system.
2. The default entry is a recent-project start page.
3. The left rail is workflow-based, not resource-based.
4. The project interior allows free step navigation.
5. The right panel supports mixed-mode contextual tabs.
6. The visual system reads as cool, technical, and professional without feeling like a wallboard.
7. Current project and SNMP profile pages fit naturally into the new shell.
8. Future workflow pages can be added without redesigning the shell again.

---

## 13. Implementation Recommendation

Implementation should proceed in two phases:

### Phase 1

- build the shell,
- start page,
- left workflow rail,
- right contextual panel,
- and re-skin existing project/profile pages into the new system.

### Phase 2

- migrate each future workflow page into the same shell as business logic arrives.

This keeps the redesign aligned with current repository reality while establishing the final product direction now.
