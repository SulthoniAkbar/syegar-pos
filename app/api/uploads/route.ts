import { handleError, ok } from "@/lib/http";
import { uploadMenuImage } from "@/services/upload.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return ok(await uploadMenuImage(await req.formData()));
  } catch (error) {
    return handleError(error);
  }
}
