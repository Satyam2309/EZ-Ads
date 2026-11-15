import { Link } from 'react-router-dom';

/**
 * One template for the six footer pages. Copy below describes what this
 * codebase actually does — keep it in step when behaviour changes.
 */
const PAGES = {
  about: {
    eyebrow: 'About',
    title: 'The influencer marketing OS',
    lead:
      'EZ Ads is a marketplace where brands and creators run campaigns end to end — from a written brief to a settled payment.',
    sections: [
      {
        h: 'What brands get',
        body: [
          'Search creators by niche, audience size and engagement, shortlist the ones worth a conversation, then send a brief with the deliverable, the timeline and the fee you have in mind.',
          'Applications, negotiation and delivery sit in one thread, so the agreed scope never gets lost between email and chat.'
        ]
      },
      {
        h: 'What creators get',
        body: [
          'A public profile that shows real, labelled performance data instead of vanity metrics, plus open campaigns you can apply to on your own terms.',
          'Fees, timelines and deliverables are visible before you say yes — and payment is tracked against the milestone you delivered.'
        ]
      },
      {
        h: 'How it is built',
        body: [
          'The product is a working demo: a React front end over an Express and MongoDB API, with authentication, campaign workflows, messaging and a simulated payment ledger.',
          'The payment layer is simulated on purpose — no card is charged and no money moves. Everything else is the real application.'
        ]
      }
    ]
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Talk to the team',
    lead: 'Questions about a campaign, a payout or the platform itself? Pick the route that fits.',
    sections: [
      {
        h: 'Product and support',
        body: [
          'Email ops@example.com for account help, campaign disputes or anything that looks broken. This address is a placeholder in the demo build — swap it for a live support inbox before launch.',
          'Include the campaign or conversation link if you have one; it makes triage much faster.'
        ]
      },
      {
        h: 'Creators',
        body: [
          'For profile verification, Instagram connection problems or payment hold questions, email the same address with the handle you signed up with.'
        ]
      },
      {
        h: 'Response times',
        body: [
          'This is a demo deployment, so there is no staffed support rota behind it. Genuine deployments should publish a response window here — typically one to two business days.'
        ]
      }
    ]
  },
  'return-policy': {
    eyebrow: 'Legal',
    title: 'Return Policy',
    lead: 'What happens when delivered work does not match the agreed brief.',
    sections: [
      {
        h: 'Scope of this policy',
        body: [
          'EZ Ads is a marketplace for services, not physical goods — so a “return” here means a revision, a redo or a reversal of a milestone payment, not shipping an item back.'
        ]
      },
      {
        h: 'Requesting a revision',
        body: [
          'If a deliverable misses the brief — wrong format, wrong creator handle, missing usage rights, late without agreement — raise it in the campaign thread before approving the milestone.',
          'The creator may revise within the timeline both sides agreed. Revisions are free when they correct a mismatch with the brief; new creative directions are a new scope and may be quoted separately.'
        ]
      },
      {
        h: 'When work cannot be fixed',
        body: [
          'If a revision is not possible or the deliverable cannot be used, the milestone can be disputed instead of approved. Both sides share the evidence in the thread and the platform reviews it.',
          'Because payments in this build are simulated, no funds are actually transferred while a dispute is open — the ledger simply records the hold.'
        ]
      },
      {
        h: 'Time limits',
        body: [
          'Raise an issue within seven days of a deliverable being marked complete. After that the milestone is treated as accepted.'
        ]
      }
    ]
  },
  'refund-policy': {
    eyebrow: 'Legal',
    title: 'Refund Policy',
    lead: 'How money moves when a campaign stops early, on this demo build and in a live one.',
    sections: [
      {
        h: 'This build charges nothing',
        body: [
          'Payment flows, balances and payouts on EZ Ads are simulated. No card is collected, no charge is made and no refund can be issued against real funds.',
          'What follows describes how the ledger behaves, and how a live deployment connected to a payment provider should behave.'
        ]
      },
      {
        h: 'Before work starts',
        body: ['A milestone that has not been started can be cancelled by the brand, and the reserved amount returns to the brand’s available balance in full.']
      },
      {
        h: 'Work in progress',
        body: [
          'Once a creator has started, cancelling settles a fair share for what was delivered — agreed in the thread before the milestone is closed.',
          'If the brand stops responding, the creator can escalate the milestone so it is not left in limbo.'
        ]
      },
      {
        h: 'After approval',
        body: [
          'Approving a milestone releases it to the creator and is final, except where the deliverable was never published or the terms were breached. Those cases go through the dispute path in the Return Policy.'
        ]
      },
      {
        h: 'Platform fees',
        body: ['Fees are only ever charged on amounts actually released, never on a cancelled or reversed milestone.']
      }
    ]
  },
  'privacy-policy': {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    lead: 'What EZ Ads stores, why it stores it, and what it never does with it.',
    sections: [
      {
        h: 'What we collect',
        body: [
          'Account details you enter: name, business or creator email, hashed password, industry, website and contact number. Passwords are stored only as a bcrypt hash.',
          'Platform activity: campaigns, briefs, applications, messages, shortlists and the simulated payment ledger entries created along the way.',
          'If you connect Instagram as a creator, we store the handle, display name and profile metrics returned by that connection.'
        ]
      },
      {
        h: 'Why we keep it',
        body: [
          'To run your account, match brands with creators, keep both sides of a negotiation on record, and show you your own campaign and payment history.',
          'Theme preference is stored in your browser’s local storage. Session authentication uses an HTTP-only cookie.'
        ]
      },
      {
        h: 'What we do not do',
        body: [
          'We do not sell personal data, and we do not share your email or contact number with the other side of a campaign unless you put it in a message yourself.'
        ]
      },
      {
        h: 'Your choices',
        body: [
          'You can edit profile details from your dashboard at any time and ask for your account to be deleted, which removes your profile and campaign history.',
          'A self-serve export or delete tool is not exposed in this demo build — deletion is handled by the operator.'
        ]
      }
    ]
  },
  disclaimer: {
    eyebrow: 'Legal',
    title: 'Disclaimer',
    lead: 'Read this before you rely on anything you see in this demo.',
    sections: [
      {
        h: 'Demo build',
        body: [
          'EZ Ads is a demonstration project. Payments, escrow balances, payouts and invoices are simulated and clearly labelled as such — no real money is collected, held or transferred.',
          'Creator follower counts, engagement rates and campaign results shown in the interface come from seeded sample data, not a live measurement pipeline.'
        ]
      },
      {
        h: 'No professional advice',
        body: [
          'Nothing on the platform is legal, tax, financial or marketing advice. Campaign terms, usage rights and disclosure obligations are your responsibility to get right for your market.'
        ]
      },
      {
        h: 'No guarantee of outcome',
        body: [
          'The platform is provided as is, without warranties of any kind. Reach, engagement, conversions and campaign results are never guaranteed by EZ Ads or by any creator.'
        ]
      },
      {
        h: 'Third-party services',
        body: [
          'Instagram connection relies on a third-party API that can change or fail independently of this project. Features that depend on it may be unavailable at times.'
        ]
      }
    ]
  }
};

export default function InfoPage({ page }) {
  const doc = PAGES[page];
  if (!doc) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-4 pt-16 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{doc.eyebrow}</p>
      <h1 className="font-(family:--font-display) mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{doc.title}</h1>
      <p className="mt-4 text-base leading-relaxed text-(--color-ink-soft)">{doc.lead}</p>

      <div className="mt-12 space-y-9">
        {doc.sections.map((section) => (
          <section key={section.h}>
            <h2 className="font-(family:--font-display) text-lg font-bold">{section.h}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-relaxed text-(--color-ink-soft)">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-(--color-line) pt-6 text-sm">
        <Link to="/" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200">
          ← Back to home
        </Link>
        <Link to="/contact" className="text-(--color-ink-soft) transition-colors hover:text-(--color-ink)">
          Contact us
        </Link>
      </div>
    </main>
  );
}
