const express = require('express');
const cors = require('cors'); // Require the cors package
const app = express();
const WebSocket = require('ws');
const port = 3000;

// Configure CORS to allow requests from http://localhost:3001
app.use(cors({
  origin: 'https://tictactoe-z9fb.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'] // Allow common headers
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const wss = new WebSocket.Server({
  server,
  verifyClient: function(info, done) {
    // Allow connections from both http://localhost:3000 and http://localhost:3001
    if (info.origin !== 'https://preview-tic-tac-toe-server-kzmlub5ez6xif72675ny.vusercontent.net' && info.origin !== 'https://tictactoe-z9fb.onrender.com') {
      console.log('WebSocket connection rejected from origin:', info.origin);
      done(false); // Reject the connection
    } else {
      console.log('WebSocket connection accepted from origin:', info.origin);
      done(true); // Accept the connection
    }
  }
});

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
      endGame(roomCode);
    } else if (checkDraw(game.board)) {
      game.draw = true;
      broadcastGameState(roomCode);
      console.log(`Game ${roomCode} is a draw!`);
      endGame(roomCode);
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
      draw: game.draw
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
    games.delete(roomCode);
    console.log(`Game ${roomCode} ended and removed.`);
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
    // Handle player disconnection (e.g., remove from game, notify other player)
    games.forEach((game, roomCode) => {
        game.players = game.players.filter(player => player.ws !== ws);
        if (game.players.length === 0) {
            games.delete(roomCode);
            console.log(`Game ${roomCode} removed due to no players.`);
        } else if (game.players.length === 1) {
            // Notify remaining player that opponent left
            game.players[0].ws.send(JSON.stringify({ type: 'opponent_disconnected', message: 'Your opponent has disconnected.' }));
            games.delete(roomCode); // Immediately remove game if one player leaves
            console.log(`Game ${roomCode} removed due to one player leaving.`);
        }
    });
  });
});