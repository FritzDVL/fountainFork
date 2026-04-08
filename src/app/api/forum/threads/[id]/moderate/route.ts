import { createClient } from "@/lib/db/server";
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

    const { action } = await req.json();
    const db = await createClient();

    if (action === "pin" || action === "unpin") {
      await db.from("forum_threads").update({ is_pinned: action === "pin" }).eq("id", params.id);
    } else if (action === "lock" || action === "unlock") {
      await db.from("forum_threads").update({ is_locked: action === "lock" }).eq("id", params.id);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
