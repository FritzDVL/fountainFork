import { createForumServiceClient } from "@/lib/db/forum-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await createForumServiceClient();

    const { data: thread, error: threadError } = await db
      .from("forum_threads")
      .select("id, reply_count")
      .eq("root_publication_id", body.threadRootPublicationId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const position = thread.reply_count + 1;

    const { error: insertError } = await db.from("forum_thread_replies").insert({
      thread_id: thread.id,
      publication_id: body.publicationId,
      content_uri: body.contentUri,
      position,
      content_text: body.contentText,
      content_json: body.contentJson,
      summary: body.summary,
      author_address: body.authorAddress,
      author_username: body.authorUsername,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await db.rpc("forum_add_reply", {
      p_thread_id: thread.id,
      p_reply_time: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, position });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
