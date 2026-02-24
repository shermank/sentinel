import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowRight,
  Landmark,
  Smartphone,
  Bitcoin,
  CreditCard,
  Home,
  Car,
  FileText,
  Mail,
  Cloud,
  Key,
  Heart,
  Briefcase,
  Globe,
  Lock,
  Users,
} from "lucide-react";

const categories = [
  {
    title: "Financial Accounts",
    icon: Landmark,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    items: [
      { name: "Bank Accounts", description: "Checking, savings, and investment account access" },
      { name: "Credit Cards", description: "Card numbers, PINs, and online account logins" },
      { name: "Retirement Accounts", description: "401k, IRA, pension account details" },
      { name: "Brokerage Accounts", description: "Stock trading and investment platform access" },
      { name: "PayPal / Venmo", description: "Digital payment platform credentials" },
    ],
  },
  {
    title: "Cryptocurrency",
    icon: Bitcoin,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    items: [
      { name: "Wallet Seed Phrases", description: "12 or 24-word recovery phrases" },
      { name: "Exchange Logins", description: "Coinbase, Binance, Kraken credentials" },
      { name: "Hardware Wallet PINs", description: "Ledger, Trezor device access codes" },
      { name: "DeFi Protocols", description: "Staking and lending platform access" },
    ],
  },
  {
    title: "Digital Devices",
    icon: Smartphone,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    items: [
      { name: "Phone Passcodes", description: "iPhone, Android device unlock codes" },
      { name: "Computer Passwords", description: "Mac, Windows, Linux login credentials" },
      { name: "Tablet Access", description: "iPad, Android tablet passwords" },
      { name: "Smart Home Devices", description: "Security systems, smart locks, cameras" },
    ],
  },
  {
    title: "Online Accounts",
    icon: Globe,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    items: [
      { name: "Email Accounts", description: "Gmail, Outlook, Yahoo access" },
      { name: "Social Media", description: "Facebook, Instagram, Twitter, LinkedIn" },
      { name: "Cloud Storage", description: "Google Drive, Dropbox, iCloud" },
      { name: "Subscription Services", description: "Netflix, Spotify, Amazon Prime" },
      { name: "Password Managers", description: "1Password, LastPass, Bitwarden master passwords" },
    ],
  },
  {
    title: "Property & Assets",
    icon: Home,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    items: [
      { name: "Real Estate Documents", description: "Deeds, mortgage info, property access" },
      { name: "Vehicle Information", description: "Titles, registration, key locations" },
      { name: "Safe Combinations", description: "Home safe and safety deposit box codes" },
      { name: "Storage Units", description: "Access codes and key locations" },
    ],
  },
  {
    title: "Legal & Business",
    icon: Briefcase,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    items: [
      { name: "Will Location", description: "Where your legal will is stored" },
      { name: "Business Accounts", description: "Company banking and admin access" },
      { name: "Domain & Hosting", description: "Website and domain registrar logins" },
      { name: "Insurance Policies", description: "Life, health, property insurance details" },
      { name: "Attorney Contact", description: "Legal representative information" },
    ],
  },
  {
    title: "Personal & Medical",
    icon: Heart,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    items: [
      { name: "Medical Records", description: "Health portal logins and record locations" },
      { name: "Prescription Info", description: "Pharmacy accounts and medication lists" },
      { name: "Emergency Contacts", description: "Important people to notify" },
      { name: "Pet Care Info", description: "Vet records, microchip info, care instructions" },
    ],
  },
  {
    title: "Final Messages",
    icon: Mail,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    items: [
      { name: "Letters to Loved Ones", description: "Personal messages for family and friends" },
      { name: "Funeral Wishes", description: "Your preferences for memorial services" },
      { name: "Photo Locations", description: "Where precious memories are stored" },
      { name: "Account Closure Instructions", description: "How to handle your digital footprint" },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-indigo-400" />
            <span className="text-xl font-bold">Eternal Sentinel</span>
          </Link>
          <div className="flex items-center space-x-4">
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
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
          What Can Trustees Manage?
        </h1>
        <p className="text-xl text-slate-300 mb-4 max-w-3xl mx-auto">
          Your digital life contains countless important accounts and assets.
          Ensure your trusted contacts can access what they need when it matters most.
        </p>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Store encrypted credentials, instructions, and messages for any of the following -
          all protected with military-grade encryption until your trustees need access.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div
              key={category.title}
              className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${category.bgColor}`}>
                  <category.icon className={`h-6 w-6 ${category.color}`} />
                </div>
                <h2 className="text-xl font-semibold">{category.title}</h2>
              </div>
              <ul className="space-y-3">
                {category.items.map((item) => (
                  <li key={item.name} className="flex items-start space-x-3">
                    <Key className="h-4 w-4 text-slate-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-slate-200 font-medium">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-2xl p-8 border border-indigo-500/30 text-center">
          <Lock className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Your Data Stays Encrypted</h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-6">
            Everything you store is encrypted with AES-256 before leaving your browser.
            Not even we can read your vault contents. Your trustees only gain access
            after multiple missed check-ins, and they&apos;ll need your vault password to decrypt.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center"><Lock className="h-4 w-4 mr-1" /> Zero-Knowledge</span>
            <span className="flex items-center"><Shield className="h-4 w-4 mr-1" /> AES-256 Encryption</span>
            <span className="flex items-center"><Users className="h-4 w-4 mr-1" /> You Control Access</span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Secure Your Digital Legacy?</h2>
        <p className="text-slate-400 mb-8 max-w-xl mx-auto">
          Start for free and ensure your loved ones are never locked out of what matters.
        </p>
        <Link href="/signup">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
            Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Eternal Sentinel. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/" className="text-sm text-slate-400 hover:text-white">Home</Link>
              <Link href="/use-cases" className="text-sm text-slate-400 hover:text-white">Use Cases</Link>
              <Link href="/login" className="text-sm text-slate-400 hover:text-white">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
