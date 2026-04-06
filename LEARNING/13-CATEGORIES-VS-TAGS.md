# Categories vs Tags — Research Section

## The Confusion

Functions (Hunting, Game Theory, etc.) were originally listed as
research categories alongside the 6 Technical categories. This made
the Research category dropdown show 17 items and blurred the line
between "what kind of research is this" and "which Functions does
this relate to."

## The Fix

**Categories = primary classification (one per thread):**
Only the 6 Technical categories: Architecture, State Machine,
Consensus, Cryptography, Account System, Security.

**Tags = cross-references (many per thread):**
The 11 Function names: Game Theory, Hunting, Property, Parenting,
Governance, Organizations, Curation, Farming, Portal, Communication,
Function Ideas.

## Why This Works

- Functions have their own boards on `/boards` for open discussion
- Research is for technical implementation details
- A research thread about "Consensus" can be tagged #hunting and
  #game-theory to show which Functions it relates to
- The two spaces serve different conversation styles

## Implementation

- Category dropdown: `getCategoriesByFeed("research").filter(c => c.section === "technical")`
- Tag dropdown: hardcoded Function slug list in `composer-panel.tsx`
- Filter toolbar on `/research`: same filter applied

## Rule

Functions are NEVER categories in Research. They are always tags.
Boards and Research are independent conversation spaces.
