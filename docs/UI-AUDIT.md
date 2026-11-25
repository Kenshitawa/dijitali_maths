# Admin UI audit

Findings from the supplied screenshots and source review. Browser snapshots vary with session state; authenticated pages require a valid local admin session for screenshot verification.

| Screen | Finding and cause | Fix applied or planned |
| --- | --- | --- |
| Login | Split hero competed with the sign-in form; labels and footer were crowded. Browser autofill may populate credentials even though the page has no preset values. | Centered, single-card layout, autocomplete disabled, visible labels, inline error icon, and verified dark-theme appearance. |
| Inbox | Tight thread rows and message surfaces made sender, subject, and replies hard to distinguish. | Thread subject and preview, timestamp, incoming/outgoing bubbles, responsive sizing, internal-note label, Enter/Shift+Enter send, and shared readable type. Verify all four inbox categories at mobile widths. |
| Dashboard | Empty visitor data rendered an indefinite loading message; account identity was truncated. | Visitor chart now distinguishes loading, empty, and error states with timeout. Full account email is in a menu. |
| Visitors | Top-pages summary was below time-series charts. | Moved top pages/device/browser summary before the visit charts. |
| Audit detail and sign-out | Modal body text and dark surface borders needed improvement; sign-out had no confirmation. | Added modal spacing/border styles and a focus-managed confirmation modal through the BoardUI modal. Verify screenshots. |
| Content, subscribers, users, settings | Legacy HTML tables use intrinsic widths and tight type sizing. | Shared table wrappers, readable type, padding, nowrap badges, and horizontal scrolling rules apply; each screen still needs responsive visual verification. |
| Events and posts | Destructive controls were visually dominant and varied by renderer. | Danger controls now use a bordered secondary treatment; existing delete confirmations remain. Verify every action. |
| Notifications | Existing viewport only surfaces new-message toast; no general notification center. | Toast sizing improved. A general notification center remains outstanding. |
| Public pages | Existing generated pages use shared site CSS; no full responsive screenshot sweep completed. | Requires separate page-by-page visual QA. |

## Verification status

`npm run build`, `npm run lint`, and `npm test` pass. Login theme and public-page responsive Playwright checks pass at 375/768/1280 px. Production-mode `/healthz` and `/readyz` checks pass; `npm audit` reports zero vulnerabilities. Full admin/public screenshot matrix, axe checks, notification center, and complete page-by-page authenticated visual review remain outstanding.
