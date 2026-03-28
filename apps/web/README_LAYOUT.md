# App HTML Layout (Class Nesting)

This app is rendered from React/Next.js JSX (not a single static `.html` file).  
The structure below reflects the DOM/class nesting used by the app.

## Root layout

```html
html
  body
    header.header
      div.header-body.body-wrapper
        span.logo-text
        nav.tabs
          a.tab(.active)

    div.app-shell
      main.app-main
        div.page
          div.filters
            div.filters-body.body-wrapper
              button.btn
              button.pill-toggle(.active)
              button.pill-toggle(.active)
              input#searchInput
              select#entitySelect
                option
              div.scroll-hints
                button.pill-toggle
                  span.badge
                button.pill-toggle
                  span.badge
              div.count

          div.status
          div.status.error

          section.sections.body-wrapper
            div.section
              div.section-header
                h2.section-heading(.faded)
                span.section-subheading
              div.cards
                article.card(.highlight .in-deck .faded)
                  div.card-head
                    div.card-title-wrap
                      img.card-thumb
                      div.card-title
                    div.card-icons
                      button.icon-btn.like(.liked)
                      button.icon-btn
                  div.rich
                    span (text node)
                    span.entity
                      img
                      span

      aside.deck-drawer(.open | .collapsed)
        div.deck-toggle-row
          button.deck-toggle(.active)
            span.badge
        div.deck-shell
          div.deck#deck
            div.deck-panel#deckPanel
              div.deck-side.deck-entities-list
                div.deck-entities-title
                div.saved-row(.active)
                  button.link
                  button.icon-btn.small
              div.deck-main
                div.deck-actions
                  input.deck-name
                  button.btn
                  button.btn.ghost
                  button.btn#copyDeckLink
                  div.deck-status#deckStatus
                div.deck-slots#deckSlots
                  div.deck-row
                    div.deck-group
                      div.deck-group-items
                        div.deck-item(.highlight)
                          img.deck-item-img
                          div.deck-chip-name
                          button.deck-item-remove
                  div.muted
```

## Notes

- Home route (`/`) redirects to `/browse`.
- `.status`, `.status.error`, `.sections`, `.scroll-hints` buttons, and many deck rows/groups are conditional.
- `EntityCard` classes are state-based:
  - `.highlight` for highlighted/in-deck cards
  - `.in-deck` when card item exists in deck
  - `.faded` when filtered out visually
