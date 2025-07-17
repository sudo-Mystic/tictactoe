"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confetti } from "@/components/ui/confetti";
import { Fireworks } from "@/components/ui/fireworks";
import { RotateCcw, Trophy, Zap, Heart } from "lucide-react";

interface GameResultScreenProps {
  result: "win" | "lose" | "draw";
  playerSymbol: string;
  onNewGame: () => void;
  show: boolean;
}

export function GameResultScreen({
  result,
  playerSymbol,
  onNewGame,
  show,
}: GameResultScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (show) {
      setAnimationPhase(1);

      if (result === "win") {
        setShowConfetti(true);
        setShowFireworks(true);
        setTimeout(() => {
          setShowConfetti(false);
          setShowFireworks(false);
        }, 6000);
      }

      const timer = setTimeout(() => setAnimationPhase(2), 500);
      return () => clearTimeout(timer);
    } else {
      setAnimationPhase(0);
      setShowConfetti(false);
      setShowFireworks(false);
    }
  }, [show, result]);

  if (!show) return null;

  const getResultConfig = () => {
    switch (result) {
      case "win":
        return {
          title: "🎉 VICTORY! 🎉",
          subtitle: "You conquered the board!",
          color: "from-green-400 via-emerald-500 to-green-600",
          bgColor: "bg-green-500/20",
          borderColor: "border-green-400/50",
          icon: <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />,
          particles: "✨🎊🏆⭐🎉",
          buttonColor: "bg-green-600 hover:bg-green-700",
        };
      case "lose":
        return {
          title: "💔 DEFEAT 💔",
          subtitle: "Better luck next time!",
          color: "from-red-400 via-red-500 to-red-600",
          bgColor: "bg-red-500/20",
          borderColor: "border-red-400/50",
          icon: <Heart className="w-16 h-16 text-red-400 animate-pulse" />,
          particles: "💭😢😔💙🌧️",
          buttonColor: "bg-red-600 hover:bg-red-700",
        };
      case "draw":
        return {
          title: "🤝 DRAW! 🤝",
          subtitle: "Evenly matched warriors!",
          color: "from-yellow-400 via-amber-500 to-orange-500",
          bgColor: "bg-yellow-500/20",
          borderColor: "border-yellow-400/50",
          icon: <Zap className="w-16 h-16 text-yellow-400 animate-spin" />,
          particles: "⚡🤝⭐🎯🔥",
          buttonColor: "bg-yellow-600 hover:bg-yellow-700",
        };
    }
  };

  const config = getResultConfig();

  return (
    <>
      <Confetti active={showConfetti} particleCount={150} />
      <Fireworks active={showFireworks} count={8} />

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-500 ${
          animationPhase >= 1 ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Result Screen */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card
          className={`
            ${config.bgColor} ${config.borderColor} border-2 backdrop-blur-md
            transition-all duration-700 ease-out transform
            ${animationPhase >= 1 ? "scale-100 opacity-100" : "scale-50 opacity-0"}
            ${animationPhase >= 2 ? "animate-pulse" : ""}
            max-w-md w-full relative overflow-hidden
          `}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className={`
                  absolute text-2xl opacity-20 animate-bounce
                  ${animationPhase >= 2 ? "animate-pulse" : ""}
                `}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                {
                  config.particles[
                    Math.floor(Math.random() * config.particles.length)
                  ]
                }
              </div>
            ))}
          </div>

          <div className="relative z-10 p-8 text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">{config.icon}</div>

            {/* Title */}
            <div className="space-y-2">
              <h1
                className={`
                  text-4xl font-bold bg-gradient-to-r ${config.color} 
                  bg-clip-text text-transparent
                  transition-all duration-1000 ease-out transform
                  ${animationPhase >= 2 ? "scale-110" : "scale-100"}
                `}
              >
                {config.title}
              </h1>
              <p className="text-gray-300 text-lg">{config.subtitle}</p>
            </div>

            {/* Player symbol display */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">You played as</p>
              <div
                className={`
                  text-6xl font-bold transition-all duration-500 transform
                  ${animationPhase >= 2 ? "scale-125 rotate-12" : "scale-100"}
                  ${playerSymbol === "X" ? "text-blue-400" : "text-red-400"}
                `}
              >
                {playerSymbol}
              </div>
            </div>

            {/* Animated stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {["Skill", "Strategy", "Fun"].map((stat, index) => (
                <div
                  key={stat}
                  className={`
                    bg-gray-800/30 rounded-lg p-3 transition-all duration-700 transform
                    ${animationPhase >= 2 ? "scale-100 opacity-100" : "scale-95 opacity-70"}
                  `}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="text-2xl font-bold text-white">
                    {result === "win"
                      ? "★★★"
                      : result === "draw"
                        ? "★★☆"
                        : "★☆☆"}
                  </div>
                  <div className="text-xs text-gray-400">{stat}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={onNewGame}
                className={`
                  w-full ${config.buttonColor} transition-all duration-300 transform
                  hover:scale-105 active:scale-95
                  ${animationPhase >= 2 ? "animate-pulse" : ""}
                `}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Play Again
              </Button>

              <div className="text-xs text-gray-500">
                {result === "win"
                  ? "🔥 You're on fire! Keep it up!"
                  : result === "draw"
                    ? "⚡ So close! Try again!"
                    : "💪 Every master was once a beginner!"}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
