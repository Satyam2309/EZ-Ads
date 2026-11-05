/**
 * Timeline metadata for the landing-page workflow ad.
 *
 * Deliberately free of three.js imports: the caption overlay and the static
 * storyboard read from here, so importing the steps never drags the 3D library
 * into the main bundle (it stays in the lazy chunk).
 */
export const AD_STEPS = [
  { id: 'search', title: 'Find the right creators', body: 'Filter by niche, audience size and engagement rate.' },
  { id: 'invite', title: 'Invite & align', body: 'Send a brief, agree deliverables and timelines.' },
  { id: 'agree', title: 'Lock the terms', body: 'Amount, 10% platform fee and deadline — recorded.' },
  { id: 'deliver', title: 'Review the work', body: 'Creator submits, the brand approves the deliverable.' },
  { id: 'pay', title: 'Release the payout', body: 'The ledger records the transfer back to the creator.' }
];

export const AD_STEP_SECONDS = 3.4;
export const AD_TOTAL_SECONDS = AD_STEPS.length * AD_STEP_SECONDS;
