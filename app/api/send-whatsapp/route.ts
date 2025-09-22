import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { to, message } = await req.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch WhatsApp settings from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("whatsapp_token, whatsapp_phone_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "WhatsApp settings not configured" }, { status: 400 });
    }

    const token = profile.whatsapp_token;
    const phoneId = profile.whatsapp_phone_id;

    if (!token || !phoneId) {
      return NextResponse.json({ error: "WhatsApp settings missing" }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
