import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Users, Clock, CheckCircle, ArrowRight } from "lucide-react";

export default function HomePage() {
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

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
          Your Digital Legacy, Secured
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          A secure dead man&apos;s switch for your passwords, documents, and final messages.
          Ensure your loved ones have access when they need it most.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              Start Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <Lock className="h-10 w-10 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure Vault</h3>
            <p className="text-slate-400">
              Store passwords, documents, and messages with military-grade encryption.
              Zero-knowledge architecture means only you can access your data.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <Clock className="h-10 w-10 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Automated Check-ins</h3>
            <p className="text-slate-400">
              Receive periodic check-in reminders via email or SMS.
              Simply confirm you&apos;re OK with one click to reset the timer.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <Users className="h-10 w-10 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Trusted Contacts</h3>
            <p className="text-slate-400">
              Designate trustees who receive vault access if you become unreachable
              after multiple missed check-ins.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold mb-6 text-center">Security First</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {["AES-256-GCM encryption", "PBKDF2 key derivation", "Zero-knowledge architecture", "End-to-end encrypted"].map((item) => (
              <div key={item} className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
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
