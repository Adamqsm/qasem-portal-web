import { buildOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { CAREERS_TITLE } from "@/lib/careers";

export const alt = "Career Growth and Learning at Qasem Portal";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function Image() {
  return buildOgImage(CAREERS_TITLE);
}
