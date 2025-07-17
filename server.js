const express = require('express');
const cors = require('cors');
const app = express();
const WebSocket = require('ws');
const http = require('http'); // Import the http module

const port = process.env.PORT || 3000; // Use Render's port

// --- CORS Configuration for HTTP requests (like health checks) ---
// This does NOT affect the WebSocket connection itself.
app.use(cors({
  origin: 'https://tictactoe-ws.vercel.app', // Your frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- A Basic Health Check Route for Render ---
app.get('/', (req, res) => {
  res.status(200).send('Server is running and healthy.');
});

// --- Create HTTP server and attach Express app ---
const server = http.createServer(app);

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({
    // We no longer attach the WebSocket server directly to the Express server.
    // Instead, we handle the upgrade manually for better control.
    noServer: true
});


// --- Manually Handle the HTTP 'upgrade' event for WebSockets ---
// This is the modern and recommended way to handle WebSocket connections.
server.on('upgrade', (request, socket, head) => {
    // Define your list of allowed origins
    const allowedOrigins = [
        'https://tictactoe-ws.vercel.app',
        'https://preview-tic-tac-toe-server-kzmlub5ez6xif72675ny.vusercontent.net', // Keep if you use this for previews
        'https://tictactoe-z9fb.onrender.com' // Your backend's own origin
    ];

    const origin = request.headers.origin;

    if (allowedOrigins.includes(origin)) {
        // If the origin is allowed, complete the WebSocket handshake
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        // If the origin is not allowed, destroy the socket to reject the connection
        console.log(`Connection from origin ${origin} rejected.`);
        socket.destroy();
    }
});


// --- Start the HTTP Server ---
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


// --- Game Logic (No changes needed here) ---

// Game state structure
const games = new Map(); // Map to store active games: { roomCode: { board: [], players: [], turn: '', winner: null, draw: false } }

// Helper function to generate a unique room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Function to create a new game
function createGame(playerWs) {
  let roomCode = generateRoomCode();
  while (games.has(roomCode)) {
    roomCode = generateRoomCode();
  }
  const game = {
    board: Array(9).fill(null),
    players: [{ ws: playerWs, symbol: 'X' }],
    turn: 'X',
    winner: null,
    draw: false,
    playerCount: 1
  };
  games.set(roomCode, game);
  playerWs.send(JSON.stringify({ type: 'game_created', roomCode: roomCode, symbol: 'X' }));
  console.log(`Game created with room code: ${roomCode}`);
  return roomCode;
}

// Function to allow a second player to join a game
function joinGame(roomCode, playerWs) {
  const game = games.get(roomCode);
  if (game && game.playerCount < 2) {
    game.players.push({ ws: playerWs, symbol: 'O' });
    game.playerCount++;
    playerWs.send(JSON.stringify({ type: 'game_joined', roomCode: roomCode, symbol: 'O' }));
    broadcastGameState(roomCode); // Broadcast initial state to both players
    console.log(`Player joined game ${roomCode}. Current players: ${game.playerCount}`);
    return true;
  } else if (game && game.playerCount === 2) {
    playerWs.send(JSON.stringify({ type: 'error', message: 'Game room is full.' }));
    return false;
  } else {
    playerWs.send(JSON.stringify({ type: 'error', message: 'Game room not found.' }));
    return false;
  }
}

// Function to handle player moves
function makeMove(roomCode, playerWs, index) {
  const game = games.get(roomCode);
  if (!game || game.winner || game.draw) return;

  const currentPlayer = game.players.find(p => p.ws === playerWs);
  if (!currentPlayer || currentPlayer.symbol !== game.turn) {
    playerWs.send(JSON.stringify({ type: 'error', message: 'Not your turn or not a player in this game.' }));
    return;
  }

  if (game.board[index] === null) {
    game.board[index] = currentPlayer.symbol;
    if (checkWin(game.board, currentPlayer.symbol)) {
      game.winner = currentPlayer.symbol;
      broadcastGameState(roomCode);
      console.log(`Player ${currentPlayer.symbol} won in game ${roomCode}!`);
      // Delay ending the game so the final state can be seen by clients
      setTimeout(() => endGame(roomCode), 2000);
    } else if (checkDraw(game.board)) {
      game.draw = true;
      broadcastGameState(roomCode);
      console.log(`Game ${roomCode} is a draw!`);
      setTimeout(() => endGame(roomCode), 2000);
    } else {
      game.turn = (game.turn === 'X' ? 'O' : 'X');
      broadcastGameState(roomCode);
    }
  } else {
    playerWs.send(JSON.stringify({ type: 'error', message: 'Cell already taken.' }));
  }
}

// Function to check for win conditions
function checkWin(board, player) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  return winPatterns.some(pattern =>
    pattern.every(index => board[index] === player)
  );
}

// Function to check for draw conditions
function checkDraw(board) {
  return board.every(cell => cell !== null);
}

// Function to broadcast game state to all connected players in a room
function broadcastGameState(roomCode) {
  const game = games.get(roomCode);
  if (game) {
    const gameState = {
      type: 'game_state',
      roomCode: roomCode,
      board: game.board,
      turn: game.turn,
      winner: game.winner,
      draw: game.draw,
      playerCount: game.playerCount
    };
    game.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(gameState));
      }
    });
  }
}

// Function to end the game and clean up resources
function endGame(roomCode) {
    const game = games.get(roomCode);
    if(game) {
        // Close connections for players in the ended game
        game.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.close(1000, "Game Over");
            }
        });
        games.delete(roomCode);
        console.log(`Game ${roomCode} ended and removed.`);
    }
}


wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    console.log(`Received message: ${message}`);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error('Failed to parse message:', error);
      return; // Skip processing malformed messages
    }

    switch (parsedMessage.type) {
      case 'create_game':
        createGame(ws);
        break;
      case 'join_game':
        joinGame(parsedMessage.roomCode, ws);
        break;
      case 'make_move':
        makeMove(parsedMessage.roomCode, ws, parsedMessage.index);
        break;
      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Find which game the disconnected client was in
    let affectedRoomCode = null;
    for (const [roomCode, game] of games.entries()) {
        const playerIndex = game.players.findIndex(p => p.ws === ws);
        if (playerIndex !== -1) {
            affectedRoomCode = roomCode;
            // Remove the player from the game
            game.players.splice(playerIndex, 1);
            game.playerCount--;
            break;
        }
    }

    if (affectedRoomCode) {
        const game = games.get(affectedRoomCode);
        // If the game still exists (i.e., wasn't ended by a win/draw)
        if (game) {
            if (game.playerCount < 2 && !game.winner && !game.draw) {
                // If one player is left, notify them and end the game
                if (game.players.length === 1) {
                    game.players[0].ws.send(JSON.stringify({ type: 'opponent_disconnected' }));
                }
                // Game is over, clean it up
                endGame(affectedRoomCode);
            }
        }
    }
  });
});
