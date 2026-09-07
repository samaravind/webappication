'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  Moon,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

function ToggleRow({
  checked,
  description,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
      <span className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
          {icon}
        </span>
        <span>
          <span className="block text-sm font-bold text-slate-950 dark:text-slate-100">
            {label}
          </span>
          <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </span>
        </span>
      </span>
      <input
        checked={checked}
        className="sr-only"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [strictUserChecks, setStrictUserChecks] = useState(true);
  const [dataExportEnabled, setDataExportEnabled] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);

    return () => document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <div className="min-h-dvh bg-[#f5f7fb] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
        <Link className="flex items-center gap-3" href="/">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-800">
            <Users className="h-5 w-5" />
          </span>
          <span className="font-black">User Studio</span>
        </Link>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-9 w-9',
              userButtonPopoverCard: 'rounded-lg shadow-2xl',
            },
          }}
        />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-white bg-white/90 px-5 py-5 shadow-lg shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
            <Settings className="h-4 w-4" />
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-black">App settings</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Control payment, theme, notifications, validation, and export options.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-5 py-4 text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
            <span className="text-xs font-bold uppercase">Payment</span>
            <p className="mt-2 text-2xl font-black">
              {paymentsEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
            <span className="text-xs font-bold uppercase">Theme</span>
            <p className="mt-2 text-2xl font-black">
              {darkMode ? 'Dark mode' : 'Light mode'}
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-white bg-white/90 p-4 shadow-lg shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <ToggleRow
            checked={paymentsEnabled}
            description="Enable payment readiness for paid user-management workflows."
            icon={<CreditCard className="h-4 w-4" />}
            label="Payment"
            onChange={setPaymentsEnabled}
          />
          <ToggleRow
            checked={darkMode}
            description="Switch this settings page into a dark workspace."
            icon={<Moon className="h-4 w-4" />}
            label="Dark mode"
            onChange={setDarkMode}
          />
          <ToggleRow
            checked={emailNotifications}
            description="Show the app as ready to send email updates for user changes."
            icon={<Bell className="h-4 w-4" />}
            label="Email notifications"
            onChange={setEmailNotifications}
          />
          <ToggleRow
            checked={strictUserChecks}
            description="Keep alphabet-only names, valid email format, and 10-digit phone checks active."
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Strict user validation"
            onChange={setStrictUserChecks}
          />
          <ToggleRow
            checked={dataExportEnabled}
            description="Enable export readiness for user list reporting."
            icon={<Download className="h-4 w-4" />}
            label="Data export"
            onChange={setDataExportEnabled}
          />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            href="/"
          >
            Back to users
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[linear-gradient(90deg,#0f766e,#0891b2)] px-5 text-sm font-bold text-white shadow-lg shadow-teal-900/20"
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save settings
          </button>
        </div>
      </main>
    </div>
  );
}
