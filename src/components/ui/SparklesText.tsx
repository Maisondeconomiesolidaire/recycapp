import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Spark {
  id: string;
  slot: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  scale: number;
  lifespan: number;
}

function Star({ color }: { color: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 21 21" className="block">
      <path
        d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Texte « étincelant » : des étoiles apparaissent en continu tout autour du
 * texte, réparties en ellipse (un emplacement par étoile pour garder l'espace),
 * avec des transitions douces. Implémentation CSS pure (sans dépendance motion).
 * Inspiré de MagicUI Sparkles Text.
 */
export function SparklesText({
  children,
  colors = { first: "#9E7AFF", second: "#FE8BBB" },
  className,
  sparklesCount = 10,
}: {
  children: ReactNode;
  colors?: { first: string; second: string };
  className?: string;
  sparklesCount?: number;
}) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    // Chaque étoile occupe un « slot » réparti uniformément autour du texte ;
    // seul un léger jitter change au renouvellement, ce qui garde l'espacement.
    const generate = (slot: number): Spark => {
      const angle = (slot / sparklesCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const radius = 0.82 + Math.random() * 0.28; // 0.82 → 1.10
      return {
        id: `${slot}-${Math.random()}`,
        slot,
        // Ellipse autour du centre (50,50). Plus large que haute pour suivre
        // un texte horizontal ; les valeurs débordent dans le padding du conteneur.
        x: 50 + Math.cos(angle) * 50 * radius,
        y: 50 + Math.sin(angle) * 58 * radius,
        color: Math.random() > 0.5 ? colors.first : colors.second,
        delay: Math.random() * 1.6,
        scale: 0.5 + Math.random() * 0.7,
        lifespan: Math.random() * 10 + 5,
      };
    };

    setSparks(Array.from({ length: sparklesCount }, (_, i) => generate(i)));

    const interval = setInterval(() => {
      setSparks((current) =>
        current.map((spark) =>
          spark.lifespan <= 0 ? generate(spark.slot) : { ...spark, lifespan: spark.lifespan - 0.1 },
        ),
      );
    }, 100);

    return () => clearInterval(interval);
  }, [colors.first, colors.second, sparklesCount]);

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center px-9 py-6",
        className,
      )}
    >
      <style>{`
        @keyframes sparklesTextTwinkle {
          0% { opacity: 0; transform: scale(0) rotate(75deg); }
          50% { opacity: 1; transform: scale(var(--spark-scale, 1)) rotate(120deg); }
          100% { opacity: 0; transform: scale(0) rotate(150deg); }
        }
      `}</style>
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="pointer-events-none absolute z-20 h-3.5 w-3.5"
          style={{
            left: `${spark.x}%`,
            top: `${spark.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="block h-full w-full"
            style={
              {
                "--spark-scale": spark.scale,
                animation: `sparklesTextTwinkle 0.8s ease-in-out ${spark.delay}s infinite`,
              } as CSSProperties
            }
          >
            <Star color={spark.color} />
          </span>
        </span>
      ))}
      <strong className="relative z-10 font-[inherit]">{children}</strong>
    </span>
  );
}
