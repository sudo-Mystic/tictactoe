"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Users, Wifi, WifiOff, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GameResultScreen } from "@/components/game-result-screen";

type GameState = {
  type: string;
  roomCode?: string;
  board?: (string | null)[];
  turn?: string;
  winner?: string | null;
  draw?: boolean;
  symbol?: string;
  message?: string;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export default function TicTacToePage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [playerSymbol, setPlayerSymbol] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<
    "menu" | "waiting" | "playing" | "finished"
  >("menu");
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | "draw" | null>(
    null,
  );
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    setConnectionStatus("connecting");
    const websocket = new WebSocket("wss://tictactoe-z9fb.onrender.com/");

    websocket.onopen = () => {
      setConnectionStatus("connected");
      setWs(websocket);
      wsRef.current = websocket;
      toast({
        title: "Connected",
        description: "Successfully connected to game server",
      });
    };

    websocket.onmessage = (event) => {
      const data: GameState = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    websocket.onclose = () => {
      setConnectionStatus("disconnected");
      setWs(null);
      wsRef.current = null;
      toast({
        title: "Disconnected",
        description: "Connection to game server lost",
        variant: "destructive",
      });
    };

    websocket.onerror = () => {
      setConnectionStatus("error");
      toast({
        title: "Connection Error",
        description: "Failed to connect to game server",
        variant: "destructive",
      });
    };
  };

  const handleWebSocketMessage = (data: GameState) => {
    switch (data.type) {
      case "game_created":
        setRoomCode(data.roomCode || "");
        setPlayerSymbol(data.symbol || null);
        setGamePhase("waiting");
        toast({
          title: "Game Created",
          description: `Room code: ${data.roomCode}`,
        });
        break;
      case "game_joined":
        setRoomCode(data.roomCode || "");
        setPlayerSymbol(data.symbol || null);
        setGamePhase("waiting");
        toast({
          title: "Game Joined",
          description: `Joined room: ${data.roomCode}`,
        });
        break;
      case "game_state":
        setGameState(data);
        if (data.winner || data.draw) {
          setGamePhase("finished");
          // Determine result and show animated screen
          if (data.winner) {
            const result = data.winner === playerSymbol ? "win" : "lose";
            setGameResult(result);
          } else if (data.draw) {
            setGameResult("draw");
          }
          // Delay showing result screen for dramatic effect
          setTimeout(() => setShowResultScreen(true), 500);
        } else {
          setGamePhase("playing");
        }
        break;
      case "opponent_disconnected":
        toast({
          title: "Opponent Left",
          description: data.message || "Your opponent has disconnected",
          variant: "destructive",
        });
        resetGame();
        break;
      case "error":
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
        break;
    }
  };

  const createGame = () => {
    if (ws && connectionStatus === "connected") {
      ws.send(JSON.stringify({ type: "create_game" }));
    }
  };

  const joinGame = () => {
    if (ws && connectionStatus === "connected" && inputRoomCode.trim()) {
      ws.send(
        JSON.stringify({
          type: "join_game",
          roomCode: inputRoomCode.trim().toUpperCase(),
        }),
      );
    }
  };

  const makeMove = (index: number) => {
    if (ws && connectionStatus === "connected" && roomCode) {
      ws.send(
        JSON.stringify({
          type: "make_move",
          roomCode: roomCode,
          index: index,
        }),
      );
      setLastMove(index);
    }
  };

  const resetGame = () => {
    setGameState(null);
    setRoomCode("");
    setInputRoomCode("");
    setPlayerSymbol(null);
    setGamePhase("menu");
    setLastMove(null);
    setShowResultScreen(false);
    setGameResult(null);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Copied",
      description: "Room code copied to clipboard",
    });
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-400" />;
      case "connecting":
        return <Wifi className="h-4 w-4 text-yellow-400 animate-pulse" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Connection Error";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Tic Tac Toe
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            {getConnectionIcon()}
            <span>{getStatusText()}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Game Controls */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Game Controls</CardTitle>
              <CardDescription>
                Create or join a multiplayer game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gamePhase === "menu" && (
                <>
                  <Button
                    onClick={createGame}
                    disabled={connectionStatus !== "connected"}
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Create New Game
                  </Button>

                  <Separator className="bg-gray-700" />

                  <div className="space-y-2">
                    <Input
                      placeholder="Enter room code"
                      value={inputRoomCode}
                      onChange={(e) =>
                        setInputRoomCode(e.target.value.toUpperCase())
                      }
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      maxLength={6}
                    />
                    <Button
                      onClick={joinGame}
                      disabled={
                        connectionStatus !== "connected" ||
                        !inputRoomCode.trim()
                      }
                      className="w-full bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      Join Game
                    </Button>
                  </div>
                </>
              )}

              {gamePhase === "waiting" && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-blue-400 border-blue-400"
                    >
                      Room: {roomCode}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyRoomCode}
                      className="h-6 w-6 p-0 hover:bg-gray-800"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <Users className="h-4 w-4 animate-pulse" />
                    <span>Waiting for opponent...</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    You are playing as{" "}
                    <span className="font-bold text-white">{playerSymbol}</span>
                  </p>
                </div>
              )}

              {(gamePhase === "playing" || gamePhase === "finished") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-blue-400 border-blue-400"
                    >
                      Room: {roomCode}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyRoomCode}
                      className="h-6 w-6 p-0 hover:bg-gray-800"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">You are</p>
                    <Badge
                      variant="secondary"
                      className="bg-gray-800 text-white"
                    >
                      {playerSymbol}
                    </Badge>
                  </div>

                  {gameState && (
                    <div className="text-center">
                      {gameState.winner ? (
                        <div
                          className={`text-lg font-bold ${
                            gameState.winner === playerSymbol
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {gameState.winner === playerSymbol
                            ? "🎉 You Won!"
                            : "😔 You Lost!"}
                        </div>
                      ) : gameState.draw ? (
                        <div className="text-lg font-bold text-yellow-400">
                          🤝 It's a Draw!
                        </div>
                      ) : (
                        <div
                          className={`text-lg ${
                            gameState.turn === playerSymbol
                              ? "text-green-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {gameState.turn === playerSymbol
                            ? "Your Turn"
                            : "Opponent's Turn"}
                        </div>
                      )}
                    </div>
                  )}

                  {gamePhase === "finished" && (
                    <Button
                      onClick={resetGame}
                      className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      New Game
                    </Button>
                  )}
                </div>
              )}

              {connectionStatus !== "connected" && (
                <Button
                  onClick={connectWebSocket}
                  className="w-full bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  Reconnect
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Game Board */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-center">
                Game Board
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                {Array.from({ length: 9 }, (_, index) => {
                  const cellValue = gameState?.board?.[index];
                  const isLastMove = lastMove === index;
                  const canPlay =
                    gamePhase === "playing" &&
                    gameState?.turn === playerSymbol &&
                    !cellValue &&
                    connectionStatus === "connected";

                  return (
                    <button
                      key={index}
                      onClick={() => canPlay && makeMove(index)}
                      disabled={!canPlay}
                      className={`
                        aspect-square bg-gray-800 border-2 border-gray-700 rounded-lg
                        flex items-center justify-center text-3xl font-bold
                        transition-all duration-300 transform
                        ${
                          canPlay
                            ? "hover:bg-gradient-to-br hover:from-gray-700 hover:to-gray-600 hover:border-blue-500/50 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer"
                            : "cursor-not-allowed"
                        }
                        ${isLastMove ? "animate-pulse bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-400/50 shadow-lg shadow-blue-500/25" : ""}
                        ${cellValue === "X" ? "text-blue-400 drop-shadow-lg" : cellValue === "O" ? "text-red-400 drop-shadow-lg" : "text-gray-500"}
                        ${cellValue ? "bg-gradient-to-br from-gray-700 to-gray-800" : ""}
                      `}
                    >
                      <span
                        className={`
                          transition-all duration-500 transform
                          ${cellValue ? "scale-100 animate-in" : "scale-0"}
                          ${isLastMove ? "animate-bounce" : ""}
                        `}
                        style={{
                          animation: isLastMove
                            ? "pulse 1s ease-in-out"
                            : undefined,
                        }}
                      >
                        {cellValue || ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {gamePhase === "menu" && (
                <div className="text-center mt-6 text-gray-400">
                  Create or join a game to start playing
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game Result Screen */}
      {gameResult && playerSymbol && (
        <GameResultScreen
          result={gameResult}
          playerSymbol={playerSymbol}
          onNewGame={resetGame}
          show={showResultScreen}
        />
      )}
    </div>
  );
}
