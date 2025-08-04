const app = require('./app');
const server = require('http').createServer(app);
const io = require("socket.io").listen(server);
const { gameStart, findPlayer } = require('./module');

// Performance optimizations
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const PLAYER_CACHE = new Map();
const GAME_STATE_CACHE = new Map();

// Optimized logging function
function log(message, ...args) {
  if (DEBUG_MODE) {
    console.log(message, ...args);
  }
}

// Cache player lookup
function findPlayerCached(socketId, players) {
  const cacheKey = `${socketId}_${players.length}`;
  if (PLAYER_CACHE.has(cacheKey)) {
    return PLAYER_CACHE.get(cacheKey);
  }
  
  const result = findPlayer(socketId, players);
  PLAYER_CACHE.set(cacheKey, result);
  return result;
}

// Clear player cache when needed
function clearPlayerCache() {
  PLAYER_CACHE.clear();
}

let onlinePlayers = new Array; //TODO: Should not be more than 4 people!
var currentPlayer = 1;
let stonePull = false;  // !???
let remaining_decks = [];

io.on('connection', (socket) => {
  const soketID = socket.id;
  log('User connected: ' + soketID);
  io.emit('players', onlinePlayers);

  socket.on('name information', (name) => {
    // Optimized name processing
    name = name.trim().toLowerCase().replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
    const playerIndex = onlinePlayers.length + 1;
    const player = { player: playerIndex, id: soketID, playernickname: name };
    
    if (onlinePlayers.length === 0) {
      player.isFirstPlayer = true;
    }
    
    onlinePlayers.push(player);
    log('Player added:', player.playernickname);
    io.emit('players', onlinePlayers);
    
    if (onlinePlayers.length === 4) { // FOR TESTING === 1 ELSE 4.
      const [ okeystone, indicatorstone, onlineList, remaining_deck ] = gameStart(onlinePlayers);
      
      // Reset old parameters when new game starts:
      currentPlayer = 1;
      stonePull = true; // First player should have the right to draw stones
      onlinePlayers = onlineList;
      remaining_decks = remaining_deck;
      okey = okeystone;
      
      // Clear caches for new game
      clearPlayerCache();
      GAME_STATE_CACHE.clear();
      
      // Optimized deck distribution
      const gameData = {
        current: currentPlayer,
        stoneRights: stonePull,
        remainingStones: remaining_deck.length
      };
      
      onlinePlayers.forEach((player, index) => {
        const playerData = {
          gameInfo: "Game begins...",
          indicatorStone: indicatorstone,
          board: onlinePlayers[index].destesi,
          player: {
            current: currentPlayer, 
            you: onlinePlayers[index].player,
            ilkBaşlar: player.isFirstPlayer,
            okeystone: okey,
          }
        };
        
        // Send all data in optimized batches
        io.to(player.id).emit('game info', playerData.gameInfo);
        io.to(player.id).emit('indicator stone', playerData.indicatorStone);
        io.to(player.id).emit('your board', playerData.board);
        io.to(player.id).emit('player', playerData.player);
        io.to(player.id).emit('number of remaining stones', playerData.remainingStones);
      });
      
      // Send initial turn information to all players
      io.emit('current player', gameData);
    }
  });

  socket.on("throw stones on the ground", (element) => {
    try {
      const findThePlayer = findPlayerCached(soketID, onlinePlayers);
      var playerRank = findThePlayer[0].player;
      
      if (playerRank === currentPlayer) {
        currentPlayer = currentPlayer === 4 ? 1 : currentPlayer + 1;
        stonePull = true;
        
        log("Turn passed to player:", currentPlayer);
        
        // Optimized event emission
        const turnData = {
          current: currentPlayer,
          stoneRights: stonePull
        };
        
        const stoneData = {
          whoSentStone: playerRank,
          stone: element.stone
        };
        
        io.emit('current player', turnData);
        io.emit('table stone', stoneData);
      }
    } catch (error) {
      log('Error in throw stones:', error);
    }
  });

  socket.on('ask for new stone', (information) => {
    log("Received 'ask for new stone' request from player:", information.player);
    const find_player = findPlayerCached(soketID, onlinePlayers);
    log("Found player:", find_player[0].playernickname);
    
    var player_deck = find_player[0].destesi;
    log("Player deck length before:", player_deck.length);

    /*if (player_deck.length >= 16) {
      log("Player already has 16 stones, cannot take more");
      return;
    }*/

    // Allow drawing until deck is completely empty (count reaches 0)
    if (remaining_decks.length === 0) {
      log("Deck is completely empty! Game should end according to Okey 101 rules.");
      io.to(soketID).emit('deck_empty', { message: "Deck is completely empty - game should end" });
      return;
    }

    let new_stone = remaining_decks.pop();
    log("Server sending new stone:", new_stone);
    
    // Double-check that we got a valid stone
    if (!new_stone) {
      log("Error: Received undefined stone from deck!");
      io.to(soketID).emit('deck_error', { message: "Error drawing stone from deck" });
      return;
    }
    
    find_player[0].destesi.push(new_stone);
    log("Player deck length after:", find_player[0].destesi.length);
    
    io.to(soketID).emit('yeni taş', new_stone);
    log("Sent 'yeni taş' event to player");

    log("Number of new stones remaining: " + remaining_decks.length);
    io.emit('number of remaining stones', remaining_decks.length);
    log("Sent 'number of remaining stones' event to all players");
    
    log("Player drew stone from middle deck, keeping turn for stone throwing");
  });

  socket.on('stone puller', (info) => {
    log("Player", info.player, "took stone from previous player");
    socket.broadcast.emit('stone puller', info.player);
    log("Player took stone from previous player, keeping turn for stone throwing");
  });

  socket.on('handisfinished', (finishing_hand) => {
    io.emit('finished', finishing_hand);
  });

  socket.on('drop combinations to table', (data) => {
    const find_player = findPlayerCached(soketID, onlinePlayers);
    const playerName = find_player[0].playernickname;
    
    const player_deck = find_player[0].destesi;
    const combinations = data.combinations;
    
    // Optimized stone removal
    const positionsToRemove = new Set();
    combinations.forEach(combo => {
      for (let i = combo.startIndex; i <= combo.endIndex; i++) {
        positionsToRemove.add(i);
      }
    });
    
    const sortedPositions = Array.from(positionsToRemove).sort((a, b) => b - a);
    sortedPositions.forEach(position => {
      if (position < player_deck.length) {
        player_deck.splice(position, 1);
      }
    });
    
    find_player[0].destesi = player_deck;
    
    io.emit('combinations dropped to table', {
      player: data.player,
      playerName: playerName,
      combinations: combinations,
      totalPoints: data.totalPoints
    });
    
    log(`Player ${playerName} dropped combinations worth ${data.totalPoints} points`);
  });

  socket.on('disconnect', () => {
    log('Disconnected: ' + soketID);
    onlinePlayers = onlinePlayers.filter(item => item.id !== soketID);
    log('Remaining players:', onlinePlayers.length);
    io.emit('players', onlinePlayers);
    
    // Clear caches for disconnected player
    clearPlayerCache();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  log(`Server listening on http://localhost:${port}`);
  log(`Debug mode: ${DEBUG_MODE}`);
});