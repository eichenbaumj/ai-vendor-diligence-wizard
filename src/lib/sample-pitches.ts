/*
  Three fictional sample pitches, matched to the sample reports in
  sample-reports.ts. These are teaching fixtures: every company, person,
  address, and number in them is invented.
*/

export type SampleId = "meridian" | "swiftgov" | "claradocs";

export interface SamplePitch {
  id: SampleId;
  label: string;
  shortLabel: string;
  text: string;
}

export const SAMPLE_PITCHES: SamplePitch[] = [
  {
    id: "meridian",
    label: "Sample: established vendor",
    shortLabel: "established vendor",
    text: `Subject: Cutting call wait times for your residents

Hi there,

I lead public-sector partnerships at Meridian Call AI. We build an AI answering layer for state and local call centers: it handles routine questions (office hours, permit status, bill pay links) and hands anything sensitive to your staff with a full transcript.

A few things about us, since you get a lot of these emails. We have been serving government contact centers since 2019. We hold an active Sourcewell cooperative contract (#031522-MCA), we are GovRAMP Authorized, and our platform is used by state agencies in Ohio and Colorado plus about thirty county and city governments. The Ohio Department of Taxation used us through the 2025 filing season and kept average phone wait under four minutes during their peak week.

We are transparent about how the product works: it runs on commercial foundation models with our own routing, redaction, and escalation layer on top, and we publish our subprocessor list. Nothing trains on your data. Pricing is a flat per-resident-served band, no per-minute surprises.

Would a 30-minute walkthrough in the next couple of weeks be useful? Happy to send our SOC 2 report under NDA and two references you can call before we ever get on a screen.

Best,
Dana Whitfield
VP Public Sector, Meridian Call AI
meridiancall.ai`,
  },
  {
    id: "swiftgov",
    label: "Sample: unverifiable vendor",
    shortLabel: "unverifiable vendor",
    text: `Subject: Your county is leaving $2M on the table (AI modernization grant deadline)

Hello,

I will keep this short because the window is closing. SwiftGov AI has been serving state governments since 2016, and our GovAssist platform now powers resident services for 14 states and over 200 agencies. We are the only AI platform that is FedRAMP certified, HIPAA certified, and CJIS certified out of the box, so procurement is painless.

Because we hold a Sourcewell cooperative contract, your team can skip the RFP entirely and be live in 30 days. Agencies using GovAssist have cut call center costs by 60 percent, guaranteed, and eliminated backlogs in benefits processing. One state saved $11M in the first year alone.

Here is the urgent part: federal AI modernization funds must be obligated by the end of this quarter, and we are limiting onboarding to five more agencies this cycle. If you sign a letter of intent this month, we will lock in legacy pricing and waive implementation fees.

I have a slot Thursday at 2pm or Friday at 10am for a demo. Which works? I can also send the contract paperwork ahead of the call to save time.

Warm regards,
Blake Morrow
Chief Growth Officer, SwiftGov AI
swiftgov-ai.com`,
  },
  {
    id: "claradocs",
    label: "Sample: young startup",
    shortLabel: "young startup",
    text: `Subject: Clearing your records request backlog

Hi,

I am the co-founder of ClaraDocs, a small team in Denver working on one narrow problem: the stack of scanned documents and public records requests sitting in every clerk's office.

ClaraDocs reads incoming documents (PDFs, scans, faxes), classifies them, extracts the fields your staff would have retyped, and drafts redactions for a human to approve. Nothing goes out the door without a person signing off. We are honest about what this is: we build on commercial language models, we add the government-records layer, and we show our work on every extraction so your staff can check it.

We are young. We incorporated in Colorado in 2024, we are a team of nine, and we closed a seed round last fall (our SEC Form D is on file if you want to look). We finished our SOC 2 Type I in June and our Type II audit window is underway with Ridgeline Assurance CPAs. We are running a paid pilot with a Colorado county clerk's office and can connect you with them directly.

We would love to run a two-week pilot on a real backlog batch, priced flat, with an exit clause and your data deleted at the end. Worth a conversation?

Thanks,
Priya Raman
Co-founder, ClaraDocs
claradocs.io`,
  },
];

export function getSamplePitch(id: string): SamplePitch | undefined {
  return SAMPLE_PITCHES.find((p) => p.id === id);
}
