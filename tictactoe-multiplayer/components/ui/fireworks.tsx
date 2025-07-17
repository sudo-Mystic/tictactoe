"use client";

import { useEffect, useState } from "react";

interface Firework {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface FireworksProps {
  active: boolean;
  count?: number;
}

export function Fireworks({ active, count = 5 }: FireworksProps) {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
  ];

  useEffect(() => {
    if (!active) {
      setFireworks([]);
      return;
    }

    const createFirework = (id: number): Firework => {
      const particles: Particle[] = [];
      const particleCount = 30;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 2 + Math.random() * 3;
        particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 100,
          maxLife: 100,
        });
      }

      return {
        id,
        x: Math.random() * window.innerWidth,
        y:
          Math.random() * (window.innerHeight * 0.6) + window.innerHeight * 0.2,
        particles,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    let fireworkIndex = 0;
    const addFirework = () => {
      setFireworks((prev) => [...prev, createFirework(fireworkIndex++)]);
    };

    // Create initial fireworks
    for (let i = 0; i < count; i++) {
      setTimeout(addFirework, i * 500);
    }

    const interval = setInterval(() => {
      setFireworks((prev) =>
        prev
          .map((firework) => ({
            ...firework,
            particles: firework.particles
              .map((particle) => ({
                ...particle,
                x: particle.x + particle.vx,
                y: particle.y + particle.vy,
                vy: particle.vy + 0.1, // gravity
                life: particle.life - 1,
              }))
              .filter((particle) => particle.life > 0),
          }))
          .filter((firework) => firework.particles.length > 0),
      );
    }, 16);

    return () => clearInterval(interval);
  }, [active, count]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {fireworks.map((firework) =>
        firework.particles.map((particle, index) => (
          <div
            key={`${firework.id}-${index}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: firework.x + particle.x,
              top: firework.y + particle.y,
              backgroundColor: firework.color,
              opacity: particle.life / particle.maxLife,
              boxShadow: `0 0 6px ${firework.color}`,
            }}
          />
        )),
      )}
    </div>
  );
}
