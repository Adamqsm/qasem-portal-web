import { buildOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Qasem Portal, a technology company building modern applications for hospitality and adjacent sectors";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function Image() {
  return buildOgImage("Modern applications for hospitality and adjacent sectors.");
}
