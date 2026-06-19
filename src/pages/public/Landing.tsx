import { Link } from "react-router-dom";
import { Wind, Truck, ShoppingBag, Bike, ArrowRight } from "lucide-react";
import { TYPE_COLORS } from "../../lib/constants";
import { WarmGrainientBackdrop } from "../../components/public/WarmGrainientBackdrop";

const services = [
  {
    to: "/aerogommage",
    icon: Wind,
    title: "Aérogommage",
    desc: "Décapage écologique de vos meubles et boiseries. Demandez un devis en quelques clics.",
    color: TYPE_COLORS.aerogommage,
  },
  {
    to: "/collecte",
    icon: Truck,
    title: "Collecte à domicile",
    desc: "Nous récupérons vos objets réemployables directement chez vous.",
    color: TYPE_COLORS.collecte,
  },
  {
    to: "/velo",
    icon: Bike,
    title: "Cycle en Bray",
    desc: "Atelier vélo : réparation, entretien, don ou recherche d'un vélo.",
    color: TYPE_COLORS.velo,
  },
  {
    to: "/boutique",
    icon: ShoppingBag,
    title: "La boutique",
    desc: "Des objets de seconde main triés et remis en état. Réservez en ligne.",
    color: TYPE_COLORS.article,
  },
];

export function Landing() {
  return (
    <div className="relative isolate overflow-hidden">
      <WarmGrainientBackdrop />

      <section className="relative mx-auto w-full max-w-[92rem] px-5 py-16 text-center sm:px-7 sm:py-24 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-sm font-medium text-brand-700 shadow-[0_8px_28px_rgba(255,170,43,0.08)] backdrop-blur-sm">
          ♻️ Recyclerie solidaire
        </span>
        <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900">
          Donnez une seconde vie
          <br />
          <span className="text-brand-600">à vos objets</span>
        </h1>
        <p className="mt-5 mx-auto max-w-xl text-lg text-zinc-600">
          Aérogommage, collecte à domicile et boutique de réemploi. Faites votre
          demande en ligne, nous nous occupons du reste.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/boutique"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Visiter la boutique
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/collecte"
            className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/70 px-5 py-3 font-medium text-zinc-700 shadow-[0_12px_32px_rgba(176,124,22,0.08)] backdrop-blur-sm transition-colors hover:bg-white"
          >
            Demander une collecte
          </Link>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[92rem] px-5 pb-24 sm:px-7 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-2xl border border-white/80 bg-white/78 p-6 shadow-[0_18px_45px_rgba(169,131,40,0.1)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_55px_rgba(169,131,40,0.16)]"
            >
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${s.color}1a`, color: s.color }}
              >
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600">{s.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:gap-2 transition-all">
                Commencer <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
