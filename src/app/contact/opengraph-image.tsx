import { buildOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Contact Qasem Portal";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function Image() {
  return buildOgImage("Reach the company.");
}
