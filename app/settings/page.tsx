"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WhatsAppSettings() {
  const supabase = createClientComponentClient();
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setMsg("Please sign in to manage settings.");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("whatsapp_token, whatsapp_phone_id, whatsapp_business_number")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setToken(data.whatsapp_token || "");
          setPhoneId(data.whatsapp_phone_id || "");
          setBusinessNumber(data.whatsapp_business_number || "");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [supabase]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Saving...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMsg("You must be signed in to save settings.");
        return;
      }
      const updates = {
        whatsapp_token: token || null,
        whatsapp_phone_id: phoneId || null,
        whatsapp_business_number: businessNumber || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...updates }, { returning: "minimal" });
      if (error) {
        console.error(error);
        setMsg("Save failed.");
      } else {
        setMsg("Settings saved ✅");
      }
    } catch (err) {
      console.error(err);
      setMsg("Save failed.");
    }
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) return <p>Loading settings...</p>;

  return (
    <form onSubmit={saveSettings} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium">WhatsApp Access Token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="Paste your token here" />
      </div>
      <div>
        <label className="block text-sm font-medium">WhatsApp Phone ID</label>
        <input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="Phone number ID" />
      </div>
      <div>
        <label className="block text-sm font-medium">Business Number (e.g. +123...)</label>
        <input value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="+123..." />
      </div>
      <div className="flex items-center space-x-3">
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Save settings</button>
        <span className="text-sm text-gray-600">{msg}</span>
      </div>
    </form>
