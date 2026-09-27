# Portable game-save envelope

BlocksCreate keeps its existing localStorage save format and migrations unchanged.

Only downloadable export/import files use this small outer envelope:

```json
{
  "format": "caldas-game-save",
  "version": 1,
  "game": "blockscreate",
  "created_at": "2026-09-27T00:00:00.000Z",
  "metadata": {
    "save_schema_version": 9
  },
  "payload": {}
}
```

## Why

Several personal browser-game projects independently implement saves. A tiny envelope can make exported files self-identifying without forcing games to share their internal schemas.

## Compatibility rules

- Existing browser/localStorage saves are unchanged.
- Legacy exported BlocksCreate JSON without an envelope still imports.
- Unknown envelope versions fail closed.
- Saves labelled for another game fail closed.
- Game-specific migrations remain owned by BlocksCreate.
- No account, cloud sync or personal identifier is required.

## Cross-project rule

Do not turn this into a shared package until another real game adopts the same envelope and doing so reduces maintenance.
