# Reference app foundations

This is a desktop evidence view that also works on phones. HIG structure and behavior apply; Naust paper and Falu red provide the identity. A customer account sits beside the deposits that explain its balance. The product is fictitious and every balance is a local demonstration balance.

Use the system font stack, with no font downloads. Type roles from the HIG web translation are title 2.125rem/1.13, section 1.1875rem/1.25, body 1rem/1.55, caption .875rem/1.5. Root text size and browser zoom remain user controlled.

Spacing uses 4, 8, 12, 16, 20, 24, 32, 40, 48 and 64 CSS pixels, expressed in rem. Targets are at least 44px in both directions, with 8px separation. Controls use a 12px radius and content panels 16px. Content has no shadow; no floating surfaces need elevation. Motion durations are 160/240/350ms, with ease-out for arrival. Only short control transitions are used. Reduced motion removes them. No glass surfaces are used, so reduced transparency is solid by default.

Semantic light tokens: background #f4f4f1, surface #fbfbf9, label #0b0b0c, secondary #565b66, separator #8b8b85, accent #a63a24, on-accent #f1f1ee, focus #1f5fd6. Dark tokens: background #111112, surface #1a1a1c, label #f1f1ee, secondary #b7b8bd, separator #77777e, accent #d66b53, on-accent #111112, focus #7aa7ff. State always includes a word. Body contrast must meet 4.5:1; control boundaries and large text 3:1.

All controls have hover, focus-visible, active, disabled and error behavior where applicable. Use semantic forms and tables, visible focus, safe insets, and wrapping identifiers. Footer links cover terms, privacy and cookies. The notice states that no cookies or tracking are used. No decorative animation, icons, external imagery or icon grids are needed: the deposit and credit records are the content.
