import { createServiceClient } from "@/lib/db/service";
import { isAdmin } from "@/lib/auth/is-admin";
import { getSession } from "@/lib/auth/get-session";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const address = session?.loggedInAs?.account?.address;
    if (!address || !(await isAdmin(address))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await createServiceClient();
    await db.from("forum_thread_replies").update({ is_hidden: true }).eq("id", params.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
