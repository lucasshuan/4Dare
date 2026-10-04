import { noStore } from "@/server/http";
import { tidyPictures } from "@/server/pictures";

/**
 * The daily tidy-up of character pictures (vercel.json crons): a second look
 * by the detector at the ones it could not check, and the files of pictures
 * sent for names that never became characters. Vercel calls it with the
 * project's CRON_SECRET; nobody else can.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore },
    );
  return Response.json(await tidyPictures(), { headers: noStore });
}
