"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  companyName?: string;
  gstNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({});
  const [userEmail, setUserEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
          return;
        }
        setUserEmail(data.user.email);
        setProfile({
          companyName: data.user.profile?.companyName || "",
          gstNumber: data.user.profile?.gstNumber || "",
          address: data.user.profile?.address || "",
          phone: data.user.profile?.phone || "",
          email: data.user.profile?.email || data.user.email,
          logoUrl: data.user.profile?.logoUrl || ""
        });
      });
  }, [router]);

  function update(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    setMessage(response.ok ? "Profile saved. New invoices will auto-fill this company info." : "Could not save profile.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <section className="p-5 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Company Profile</h1>
          <p className="text-sm text-slate-500">Signed in as {userEmail || "..."}</p>
        </div>
        <button className="btn-secondary" onClick={logout}>Sign out</button>
      </div>
      <form onSubmit={saveProfile} className="max-w-3xl rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company name" value={profile.companyName || ""} onChange={(value) => update("companyName", value)} />
          <Field label="GST/HST number" value={profile.gstNumber || ""} onChange={(value) => update("gstNumber", value)} />
          <Field label="Company email" value={profile.email || ""} onChange={(value) => update("email", value)} />
          <Field label="Phone" value={profile.phone || ""} onChange={(value) => update("phone", value)} />
          <div className="md:col-span-2">
            <Field label="Address" value={profile.address || ""} onChange={(value) => update("address", value)} />
          </div>
          <div className="md:col-span-2">
            <Field label="Logo URL" value={profile.logoUrl || ""} onChange={(value) => update("logoUrl", value)} />
          </div>
        </div>
        {message ? <p className="mt-4 text-sm font-medium text-slate-700">{message}</p> : null}
        <button className="btn-primary mt-5" type="submit">Save profile</button>
      </form>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label>{label}</label>
      <input className="mt-1 w-full" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
