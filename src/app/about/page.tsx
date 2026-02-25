import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Lock, KeyRound, RefreshCw, ShieldCheck, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-indigo-400" />
            <span className="text-xl font-bold">Eternal Sentinel</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/about">
              <Button variant="ghost" className="text-white hover:text-indigo-300">About Us</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-indigo-300">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
          About Eternal Sentinel
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Protecting your digital legacy with uncompromising security.
        </p>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Everyone accumulates a digital life &mdash; passwords, documents, private messages,
            financial records. But what happens to all of it if you&apos;re suddenly gone?
          </p>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Eternal Sentinel exists to solve this problem. We provide a secure dead man&apos;s
            switch that ensures your most important information reaches the people you trust,
            but only when it&apos;s truly needed.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed">
            No one &mdash; not even us &mdash; can access your vault. Your data stays encrypted
            and under your control until the moment your trusted contacts need it.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="h-8 w-8 text-indigo-400" />
            <h2 className="text-3xl font-bold">Zero-Knowledge Architecture</h2>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Eternal Sentinel is built on a zero-knowledge model. All encryption and decryption
            happens entirely on your device &mdash; your master password and encryption keys
            never leave your browser.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Our servers store only encrypted blobs. We have no ability to read, decrypt, or
            recover your data. Even if our servers were compromised, an attacker would gain
            nothing but ciphertext that is computationally infeasible to break.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed">
            This means you are the sole custodian of your vault. We cannot reset your
            password or recover your data if you lose it &mdash; and that&apos;s by design.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <RefreshCw className="h-8 w-8 text-indigo-400" />
            <h2 className="text-3xl font-bold">How It Works</h2>
          </div>
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-semibold mb-2 text-indigo-300">1. Check-In</h3>
              <p className="text-slate-400">
                You receive periodic check-in reminders via email or SMS on a schedule you
                choose. A single click confirms you&apos;re OK and resets the countdown timer.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-semibold mb-2 text-indigo-300">2. Escalation</h3>
              <p className="text-slate-400">
                If you miss a check-in, Eternal Sentinel escalates &mdash; sending additional
                reminders through multiple channels. This grace period protects against
                accidental misses, vacations, or temporary unavailability.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-semibold mb-2 text-indigo-300">3. Dead Man&apos;s Switch</h3>
              <p className="text-slate-400">
                After all escalation attempts are exhausted without a response, the protocol
                activates. Your designated trustees are notified and granted access to the
                vault items you assigned to them. Any final letters you&apos;ve prepared are
                delivered to their intended recipients.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <Mail className="h-8 w-8 text-indigo-400" />
            <h2 className="text-3xl font-bold">Final Letters</h2>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Some things are too important to leave unsaid. Final Letters lets you write
            personal messages to the people who matter most &mdash; a spouse, a child, a
            lifelong friend &mdash; and have them delivered only when the time comes.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            Compose as many letters as you need, each addressed to a specific recipient.
            Your letter contents are encrypted with the same zero-knowledge architecture
            as your vault, so no one can read them until your protocol activates.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed">
            When you&apos;re satisfied with a letter, mark it as &ldquo;Ready.&rdquo; If the
            dead man&apos;s switch triggers, every ready letter is automatically delivered
            to its recipient via email. Draft letters are never sent, giving you full
            control over what gets delivered.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
            <h2 className="text-3xl font-bold">Security Details</h2>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <KeyRound className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold">AES-256-GCM Encryption</h3>
              </div>
              <p className="text-slate-400 ml-7">
                Every vault item is encrypted with AES-256-GCM, an authenticated encryption
                algorithm that provides both confidentiality and integrity. Each item uses a
                unique random nonce, preventing any pattern analysis across your stored data.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <KeyRound className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold">PBKDF2 Key Derivation</h3>
              </div>
              <p className="text-slate-400 ml-7">
                Your master password is never stored or transmitted. Instead, PBKDF2 derives
                a high-entropy encryption key from your password using hundreds of thousands
                of iterations, making brute-force attacks impractical even with specialized
                hardware.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <KeyRound className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold">Per-Item Nonces</h3>
              </div>
              <p className="text-slate-400 ml-7">
                Each vault item is encrypted with its own randomly generated nonce (number
                used once). This ensures that even identical plaintext values produce entirely
                different ciphertext, eliminating any information leakage between items.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <KeyRound className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold">Client-Side Only</h3>
              </div>
              <p className="text-slate-400 ml-7">
                All cryptographic operations run in your browser using the Web Crypto API.
                Your plaintext data and encryption keys exist only in your device&apos;s memory
                and are never sent to our servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Eternal Sentinel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
