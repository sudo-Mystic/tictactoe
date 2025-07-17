"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  velocity: {
    x: number;
    y: number;
  };
  rotationSpeed: number;
}

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
}

export function Confetti({ active, particleCount = 100 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8E8",
    "#F7DC6F",
    "#BB8FCE",
  ];

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const createPiece = (id: number): ConfettiPiece => ({
      id,
      x: Math.random() * window.innerWidth,
      y: -10,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 3 + 2,
      },
      rotationSpeed: (Math.random() - 0.5) * 5,
    });

    const initialPieces = Array.from({ length: particleCount }, (_, i) =>
      createPiece(i),
    );
    setPieces(initialPieces);

    const interval = setInterval(() => {
      setPieces((prevPieces) =>
        prevPieces
          .map((piece) => ({
            ...piece,
            x: piece.x + piece.velocity.x,
            y: piece.y + piece.velocity.y,
            rotation: piece.rotation + piece.rotationSpeed,
            velocity: {
              ...piece.velocity,
              y: piece.velocity.y + 0.1, // gravity
            },
          }))
          .filter((piece) => piece.y < window.innerHeight + 10),
      );
    }, 16);

    return () => clearInterval(interval);
  }, [active, particleCount]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 opacity-90"
          style={{
            left: piece.x,
            top: piece.y,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
        />
      ))}
    </div>
  );
}
