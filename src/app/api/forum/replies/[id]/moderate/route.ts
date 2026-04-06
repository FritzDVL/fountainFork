import { createClient } from "@/lib/db/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { getSession } from "@/lib/auth/get-session";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.address || !(await isAdmin(session.address))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await createClient();

    await db.from("forum_thread_replies").update({ is_hidden: true }).eq("id", params.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
