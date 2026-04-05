import { createClient } from "@/lib/db/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await createClient();

    const { error } = await db.from("forum_threads").insert({
      root_publication_id: body.publicationId,
      content_uri: body.contentUri,
      feed: body.feed,
      category: body.category,
      title: body.title,
      summary: body.summary,
      content_text: body.contentText,
      content_json: body.contentJson,
      author_address: body.authorAddress,
      author_username: body.authorUsername,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await db.rpc("forum_add_thread_to_category", { p_slug: body.category });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
