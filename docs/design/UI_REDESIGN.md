# Viral-re UI redesign direction

## Product position

Viral-re is a search and comparison product, not a promotional landing page. The interface should make users feel that campaign data is current, comparable, and easy to act on.

## Visual rules

- Use a quiet neutral canvas, ink-like text, and one cobalt accent. Status colours are reserved for real status.
- Use SVG icons only. Emoji is not used as a navigation, action, or metric icon.
- Prefer 12–16px radii, 1px borders, tonal surface layers, and restrained shadows over gradients or glass effects.
- Use Korean system fonts; do not add a remote font dependency.

## Interaction rules

- Search expresses intent; filters express attributes. Applied filters remain visible as removable chips.
- Desktop has compact filter controls. Mobile uses a full-width sheet rather than hover-only interactions.
- Results prioritize deadline, benefit, platform, source, and capacity in that order.
- Loading, unavailable data, and empty results are explicit states, never implied by decorative placeholders.

## Delivery order

1. Establish tokens and reusable controls.
2. Rebuild the search header, filter bar, and campaign card hierarchy.
3. Rebuild keyword analysis as a dense, legible data workspace.
4. Consolidate saved conditions, alerts, and bookmarks into a personal workspace.
5. Complete desktop/mobile visual QA before release.
