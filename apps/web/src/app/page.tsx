import Link from 'next/link';
import { Header } from '@/components/Header';
import { ChevronRight, MapPin, Sparkles, Bike, Leaf, ShieldCheck, BarChart3, Clock } from 'lucide-react';

const CUISINES = ['Pakistani', 'Pizza', 'Burgers', 'Healthy Bowls', 'Middle Eastern', 'Indian', 'Chinese', 'Coffee', 'Desserts'];

const FEATURES = [
  { icon: Sparkles, title: 'AI Meal Pilot', desc: 'Tell us your budget, mood and diet — we plan the meal.' },
  { icon: Bike, title: 'Live tracking', desc: 'Watch your courier arrive in real time on the map.' },
  { icon: Leaf, title: 'Sustainable options', desc: 'Eco-packaging, no-cutlery and bicycle delivery.' },
  { icon: ShieldCheck, title: 'Transparent fees', desc: 'See every charge before you pay. No surprises.' },
  { icon: BarChart3, title: 'Smart recommendations', desc: 'Reorder favourites and discover trending picks.' },
  { icon: Clock, title: 'Schedule ahead', desc: 'Order now or schedule for later — your call.' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-gray-100 bg-hero-glow">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <div className="badge mb-4 bg-white/80 text-brand-700">AI-powered • Local-first</div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                  Crave it. Order it. <span className="text-brand-500">Eat it.</span>
                </h1>
                <p className="mt-4 max-w-md text-base text-gray-600">
                  FoodPilot blends great restaurants with smart recommendations and live tracking so dinner is one tap away.
                </p>
                <form action="/restaurants" className="mt-6 flex max-w-md gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-soft">
                  <div className="flex flex-1 items-center gap-2 px-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <input
                      name="q"
                      placeholder="Enter your delivery address"
                      className="w-full bg-transparent py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Find food</button>
                </form>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
                  {CUISINES.slice(0, 5).map((c) => (
                    <Link key={c} href={`/restaurants?cuisine=${encodeURIComponent(c)}`} className="badge bg-white text-gray-700 hover:bg-gray-50">{c}</Link>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'https://loremflickr.com/300/320/biryani,food',
                    'https://loremflickr.com/300/320/pizza,food',
                    'https://loremflickr.com/300/320/burger,food',
                    'https://loremflickr.com/300/320/bowl,food',
                  ].map((src, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={src} alt="" className="h-44 w-full rounded-2xl object-cover shadow-soft md:h-56" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Popular cuisines</h2>
            <Link href="/restaurants" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {CUISINES.map((c) => (
              <Link
                key={c}
                href={`/restaurants?cuisine=${encodeURIComponent(c)}`}
                className="group flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-soft transition hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://loremflickr.com/200/200/${encodeURIComponent(c)},food`}
                  alt={c}
                  className="h-20 w-20 rounded-2xl object-cover transition group-hover:scale-105"
                />
                <span className="text-sm font-medium">{c}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Why FoodPilot</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <f.icon className="h-6 w-6 text-brand-500" />
                <div className="mt-3 font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-gray-600">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-100 bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Ready to eat?</h2>
            <p className="mt-2 text-gray-600">Sign up in seconds and get 10% off with code <span className="font-semibold text-brand-600">WELCOME10</span>.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/register" className="btn btn-primary">Create account</Link>
              <Link href="/restaurants" className="btn btn-outline">Browse restaurants</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} FoodPilot · Built as a demo platform
      </footer>
    </div>
  );
}
