const superagent = require("superagent");
function findIndices(letter, word) {
  return word
    .split("")
    .map((l, i) => {
      if (l === letter) {
        return i;
      }
    })
    .filter((index) => index >= 0);
}

exports.handler = function (context, event, callback) {
  // Here's an example of setting up some TWiML to respond to with this function
  let greenSquares = String(event.green.toLowerCase());
  let yellowSquares = event.yellow ? event.yellow.toLowerCase() : "";
  //let guesses = event.guess.toLowerCase();
  let guesses = event.guesses.toLowerCase().split(",");
  // Finds yellow places (right letter wrong space)
  // Looks like {'e': [4, 3], 'a': [0]}
  const yellowIndices = yellowSquares.split("").reduce((indices, letter) => {
    guesses.forEach((guess) => {
      if (indices[letter] === undefined) {
        indices[letter] = [];
      }
      const foundIndices = findIndices(letter, guess);
      indices[letter] = indices[letter].concat(foundIndices);
    });
    return indices;
  }, {});
  console.log(`yellowIndices ${JSON.stringify(yellowIndices)}`);
  console.log(`guess ${guesses}, greenSquares ${greenSquares}, yellowSquares ${yellowSquares}`);
  const blackSquares = guesses
    // To an array of arrays of letters
    .map((word) => word.split(""))
    // To a single array
    .flat()
    // Only the missing letters
    .filter((letter) => {
      return !yellowSquares.includes(letter) && !greenSquares.includes(letter);
    }); //get black squares
  console.log(`blackSquares ${blackSquares}`);
  let messagePattern = greenSquares + `,//${yellowSquares + '?'.repeat(5 - yellowSquares.length)}`;
  //let messagePattern = greenSquares + `,*${yellowSquares}*`; 
  console.log(`messagePattern ${messagePattern}`);
  superagent.get(`https://api.datamuse.com/words?max=1000&sp=${messagePattern}`).end((err, res) => {
    if (res.body.length <= 2) { //Datamuse doesn't have any related words
      console.log("no related words");
      return callback(null, { "words": [] });
    } //if
    let allWords = res.body.map(obj => obj.word);
    let wordsWithoutBlackLetters = allWords.filter(
      word => {
        return word.split("").every(letter => !blackSquares.includes(letter));
      });
    console.log(`wordsWithoutBlackLetters ${wordsWithoutBlackLetters}`);
    const withoutIncorrectYellow = wordsWithoutBlackLetters.filter((word) => {
      // for each letter in the indices
      for (const [letter, indices] of Object.entries(yellowIndices)) {
        for (const index of indices) {
          if (word.charAt(index) === letter) {
            // Short circuit (Johnny 5 alive)
            return false;
          }
        }
      }
      // It's a keeper!
      return true;
    });
    return callback(null, { 
      "words": withoutIncorrectYellow.slice(0, 10), //due to message length restrictions and these are the likeliest words
      "guesses": guesses
    });
  });
};
