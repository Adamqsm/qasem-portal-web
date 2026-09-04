/**
 * The Career Growth and Learning page, as data.
 *
 * The page exists to state, publicly and specifically, what Qasem Portal
 * commits to the people it employs. It is the statement LinkedIn's
 * "Career growth and learning" Company Page commitment points at, and it has
 * to stand up to a reader who checks it, so the copy is held here rather than
 * inline in the page so that a test can pin it: three commitments and one
 * closing line, no statistic, no count, no outcome claimed, and the site's
 * own copy rules (no em-dash, no "holding", no parent/above/under framing of
 * the ventures) holding throughout.
 *
 * Substance is fixed. Adjust wording only for the site's voice, never for
 * effect: nothing on this page may claim more than the company actually does.
 */

export const CAREERS_PATH = "/careers";

export const CAREERS_TITLE = "Career Growth and Learning";

export const CAREERS_SUBHEAD =
  "Our commitment to the people who build Qasem Portal and its ventures.";

/** Meta description: the three commitments in one sentence, nothing added. */
export const CAREERS_DESCRIPTION =
  "How Qasem Portal invests in its people: professional courses through Coursera, a mentor for every employee, and applied experience on live projects.";

export const COMMITMENTS = [
  {
    id: "professional-development",
    label: "Part one",
    heading: "Professional development.",
    body:
      "Every member of the Qasem Portal team is granted access to a curated library of professional courses delivered through Coursera, selected to align with their specific discipline and career trajectory. Course selection is reviewed periodically to ensure continued relevance to each employee's evolving responsibilities.",
  },
  {
    id: "mentorship",
    label: "Part two",
    heading: "Mentorship.",
    body:
      "Each employee is paired with a mentor within the organization, providing structured guidance, regular feedback, and a direct channel for professional counsel throughout their tenure.",
  },
  {
    id: "applied-experience",
    label: "Part three",
    heading: "Applied experience.",
    body:
      "Beyond formal instruction, employees are given the opportunity to apply new knowledge directly to live projects and ventures within Qasem Portal, ensuring that learning translates into demonstrable, hands-on capability.",
  },
] as const;

export const CAREERS_CLOSING =
  "We view the growth of our people as inseparable from the growth of the organization itself.";
