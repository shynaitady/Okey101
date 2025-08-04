const _ = require('underscore');

function gameStart(onlineList) {
  numbers = ["1","2","3","4","5","6","7","8","9","10","11","12","13"];
  colours = ["Red", "Yellow", "Black", "Blue"];
  deck = new Array;
  
  const stone = {
    isOkey: false,
    isIndicator: false,
    isFalseJoker: false,
    playernickname: function() {
      return `${this.colour} (${this.numb})`;
    },
    colornumberWrite: function() {
      console.log(`${this.colour} (${this.numb})`);
    }
  };
  
  const joker = Object.create(stone);
  joker.colour = "";
  // For sorting to always be at the end: NO.
  joker.numb = "";
  joker.isFalseJoker = true;
  
  function valueofjoker(fakejoker) {
    // Give the real okey's values to the fake okey.
    if (fakejoker.isFalseJoker) {
      fakejoker.colour = okeystone.colour;
      fakejoker.numb = okeystone.numb;
    };
  };
  
  for (let colour = 0; colour < colours.length; colour++) {
    for (let numb = 0; numb < numbers.length; numb++) {
      let me = Object.create(stone);
      me.colour = colours[colour];
      me.numb = numbers[numb];
      // me.playernickname();
      deck.push(me);
      deck.push(me);  // 2 of each stone.
    };
  };
  
  var deck = _.shuffle(deck);  // First shuffle.
  
  // Fake okey will be pushed later so it won't be selected as okey.
  // Select the first stone as Okey. Its pair is automatically selected.
  const okeystone = deck[0];
  okeystone.isOkey = true;
  console.log(okeystone);

  valueofjoker(joker);
  deck.push(joker);
  deck.push(joker);
  
  for (let i = 0; i < deck.length; i++) {
    const stone = deck[i];
    // TODO: If Okey = 1, direct the indicator to 13!
    if (okeystone.numb !== "1") {
      if (stone.colour === okeystone.colour && Number(stone.numb) === Number(okeystone.numb) - 1) {
        var indicatorstone = stone;
        indicatorstone.isIndicator = true;
        console.log(indicatorstone);
        break
      }
          } else {
        if (stone.colour === okeystone.colour && stone.numb === "13") {
          var indicatorstone = stone;  //Test: Try accessing this from outside. Works!
        indicatorstone.isIndicator = true;
        console.log(indicatorstone);
        break
      }
    }
  }
  var deck = _.shuffle(deck); // Final shuffle. After fake okey is added.
  
  // Move functions to separate .js file.
  function deckSort(deck) {
    deck.sort((a, b) => {
      return a.numb - b.numb;
    });
  };

  for (let player = 0; player < onlineList.length; player++) {
    destesi = new Array;
    // Give the first player an extra 1 stone.
    if (onlineList[player].isFirstPlayer) {
      const stone = deck.pop();
      destesi.push(stone);
    };
    for (let stone = 0; stone < 14; stone++) {
      const stone = deck.pop();
      destesi.push(stone);
    };
    deckSort(destesi);  // Sorts everyone's deck.
    onlineList[player].destesi = destesi;
  };
  
  console.log("Number of stones in the middle: " + deck.length); //!TODO: This will be sent via socket.
  return [okeystone, indicatorstone, onlineList, deck];
};

function findPlayer(soketID, onlineList) {
  return _.where(onlineList, { id: soketID });  // Returns list!
};

module.exports = {
  gameStart,
  findPlayer,
};