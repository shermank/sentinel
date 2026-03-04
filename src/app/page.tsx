"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield, Lock, Users, Clock, CheckCircle, ArrowRight,
  Menu, X, ChevronDown, ChevronUp, ExternalLink, Scale, Heart, Gift
} from "lucide-react";

const faqs = [
  {
    q: "What if I miss a check-in by accident?",
    a: "No problem — you get multiple reminders before anything happens. We send escalating alerts via email (and SMS on Premium). You have a full grace period to respond. Your trustees are only notified after several consecutive missed check-ins, not just one.",
  },
  {
    q: "Who can see my data?",
    a: "Nobody but you — until you're gone. All vault content is encrypted with AES-256-GCM before it ever leaves your device. We use a zero-knowledge architecture, meaning even we cannot read your data. Your trustees only receive access after the dead man switch is triggered.",
  },
  {
    q: "What do my trustees actually receive?",
    a: "They receive a secure access link with a one-time verification code. Once verified, they can view the vault items and letters you've designated for them. You control exactly what each trustee can see — some may get everything, others just specific items.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, absolutely. No contracts, no cancellation fees. If you're on Premium, you keep access until the end of your billing period. Your vault data can be exported or deleted at any time.",
  },
  {
    q: "Is Eternal Sentinel a replacement for a will?",
    a: "No — and we're upfront about that. A legal will handles asset distribution, guardianship, and probate. Eternal Sentinel handles the digital side: passwords, accounts, messages, and instructions your loved ones will need immediately. They work best together. See our Legal Resources section below.",
  },
];

const legalResources = [
  {
    name: "Trust & Will",
    url: "https://trustandwill.com",
    description: "Online wills, trusts, and estate planning. Simple, attorney-approved documents.",
  },
  {
    name: "FreeWill",
    url: "https://freewill.com",
    description: "Create a legally valid will for free. Partnered with nonprofits and financial advisors.",
  },
  {
    name: "Tomorrow",
    url: "https://tomorrow.me",
    description: "Estate planning app with wills, guardianship, and life insurance in one place.",
  },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">Eternal Sentinel</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/about" className="text-slate-600 hover:text-teal-700 font-medium transition-colors">About</Link>
              <a href="#pricing" className="text-slate-600 hover:text-teal-700 font-medium transition-colors">Pricing</a>
              <a href="#faq" className="text-slate-600 hover:text-teal-700 font-medium transition-colors">FAQ</a>
              <Link href="/login">
                <Button variant="ghost" className="text-slate-700 hover:text-teal-700">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white shadow-sm">
                  Get started free
                </Button>
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden pt-4 pb-2 space-y-2 border-t border-slate-100 mt-4">
              <Link href="/about" className="block px-2 py-2 text-slate-700 hover:text-teal-700 font-medium">About</Link>
              <a href="#pricing" className="block px-2 py-2 text-slate-700 hover:text-teal-700 font-medium" onClick={() => setMenuOpen(false)}>Pricing</a>
              <a href="#faq" className="block px-2 py-2 text-slate-700 hover:text-teal-700 font-medium" onClick={() => setMenuOpen(false)}>FAQ</a>
              <Link href="/login" className="block px-2 py-2 text-slate-700 hover:text-teal-700 font-medium">Sign in</Link>
              <Link href="/signup">
                <Button className="w-full mt-2 bg-gradient-to-r from-teal-600 to-indigo-600 text-white">Get started free</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-8 backdrop-blur-sm">
            <Gift className="h-4 w-4" />
            <span>Leave them a gift, not a mystery</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            When you can&apos;t be there,<br />
            <span className="text-amber-300">your loved ones still will be.</span>
          </h1>
          <p className="text-lg md:text-xl text-teal-100 mb-10 max-w-2xl mx-auto">
            Eternal Sentinel keeps your passwords, documents, and final messages safe —
            and delivers them to the people you trust, exactly when they need them.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold shadow-lg">
                Start for free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 backdrop-blur-sm">
                See how it works
              </Button>
            </a>
          </div>
          <p className="mt-6 text-sm text-teal-200">No credit card required · Free plan available · Cancel anytime</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Three simple steps. Set it up once, and you&apos;re protected for life.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                color: "bg-teal-50 text-teal-600",
                step: "01",
                title: "Fill your vault",
                desc: "Store passwords, documents, financial accounts, and personal messages — all encrypted with AES-256 before leaving your device.",
              },
              {
                icon: Clock,
                color: "bg-indigo-50 text-indigo-600",
                step: "02",
                title: "Check in regularly",
                desc: "Get a gentle reminder by email or SMS. Click to confirm you're okay. If you stop responding, the process begins.",
              },
              {
                icon: Users,
                color: "bg-amber-50 text-amber-600",
                step: "03",
                title: "Your people get what they need",
                desc: "Designated trustees receive secure access to your vault — the accounts, instructions, and messages you left for them.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-4xl font-bold text-slate-100">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security strip */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 items-center text-slate-500 text-sm">
            {["AES-256-GCM encryption", "PBKDF2 key derivation", "Zero-knowledge architecture", "End-to-end encrypted", "SOC 2 ready"].map((item) => (
              <div key={item} className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple, honest pricing</h2>
            <p className="text-slate-500 text-lg">Start free. Upgrade when you&apos;re ready.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Free</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-400 mb-1">/ forever</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 text-slate-600">
                {[
                  "1 trusted contact",
                  "Monthly check-ins",
                  "Encrypted vault",
                  "Email notifications",
                  "Unlimited vault items",
                ].map((f) => (
                  <li key={f} className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full border-slate-300 hover:border-teal-500 hover:text-teal-700">
                  Get started free
                </Button>
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-gradient-to-br from-teal-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-teal-100 mb-1">Premium</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-teal-300 mb-1">/ month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 text-teal-50">
                {[
                  "Unlimited trusted contacts",
                  "Weekly or daily check-ins",
                  "SMS alerts",
                  "Scheduled future messages",
                  "Priority support",
                  "Everything in Free",
                ].map((f) => (
                  <li key={f} className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-amber-300 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold">
                  Start Premium free trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Legal resources */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 mb-4">
              <Scale className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Complete your legacy plan</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Eternal Sentinel handles the digital side. A legal will handles assets and guardianship.
              Together, they give your family everything they need. Many US states — including Maryland —
              now legally recognize online wills.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {legalResources.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl p-6 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">{r.name}</h3>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-sm text-slate-500 group-hover:text-slate-600 leading-relaxed">{r.description}</p>
              </a>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">
            These are independent services. We are not affiliated with or compensated by them.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Common questions</h2>
            <p className="text-slate-500">We get it — this is important stuff. Here are the answers.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-5 w-5 text-teal-600 flex-shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <Heart className="h-10 w-10 mx-auto mb-6 text-amber-300" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">The greatest gift is peace of mind.</h2>
          <p className="text-teal-100 text-lg mb-8 max-w-xl mx-auto">
            Take 10 minutes today. Set up your vault, add a trustee, and know that the people you love will be taken care of.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold shadow-lg">
              Get started free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-white font-semibold">Eternal Sentinel</span>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Eternal Sentinel. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <Link href="/use-cases" className="hover:text-white transition-colors">Use cases</Link>
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
