# Finish the Ether rebrand and mobile polish

## What will change
- Replace the remaining “Craft Control” wording and pickaxe marks with the Ether name and supplied purple logo.
- Keep the large PNG artwork for in-app branding and the separate ICO/PNG favicon files for browser icons.
- Refresh the sign-in and create-account screen with clearer hierarchy, password visibility controls, stronger feedback, and a compact mobile-first layout.
- Improve the fresh-account dashboard so connection setup, pairing codes, addresses, and actions fit narrow phone screens without clipping or overflow.
- Finish the linked dashboard branding and add the owner-only Team area so the owner can add or remove admins.

## Technical details
- Reuse the existing semantic purple theme and shared controls rather than adding one-off colors.
- Wire owner/admin role data into the dashboard without changing the existing server-control behavior.
- Update page titles and social metadata to Ether on every content page.
- Validate the signed-out experience and dashboard layouts at phone and desktop sizes, then fix any build or browser errors found.

## Assumptions
- The public product name is **Ether**; existing internal asset/component names can remain unchanged where users never see them.
- “More features” on the account page means practical sign-in improvements, not new login providers or account fields.
