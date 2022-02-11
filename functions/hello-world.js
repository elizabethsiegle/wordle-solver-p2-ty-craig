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
    let greensquares = String(event.green.toLowerCase());
    let yellowsquares = event.yellow ? event.yellow.toLowerCase(): "";
    //let guesses = event.guess.toLowerCase();
    let guesses = event.guesses.toLowerCase().split(",");
    // Finds yellow places (right letter wrong space)
// Looks like {'e': [4, 3], 'a': [0]}
const yellowIndices = yellowsquares.split("").reduce((indices, letter) => {
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
    console.log(`guess ${guesses}, greensquares ${greensquares}, yellowsquares ${yellowsquares}`);
    const blacksquares = guesses
  // To an array of arrays of letters
  .map((word) => word.split(""))
  // To a single array
  .flat()
  // Only the missing letters
  .filter((letter) => {
    return !yellowsquares.includes(letter) && !greensquares.includes(letter);
  }); //get black squares
    console.log(`blacksquares ${blacksquares}`);
    let inbMsg = greensquares + `,//${yellowsquares + '?'.repeat(5 - yellowsquares.length)}`;
    //let inbMsg = greensquares + `,*${yellowsquares}*`; 
    console.log(`inbMsg ${inbMsg}`);
    superagent.get(`https://api.datamuse.com/words?sp=${inbMsg}`).end((err, res) => {
        if (res.body.length <= 2) { //Datamuse doesn't have any related words
            console.log("no related words");
            return callback(null, { "words": [] });
        } //if
        let allWords = res.body.map(obj => obj.word);
        let wordsWithoutBlackLetters = allWords.filter(
            word => {
                return word.split("").every(letter => !blacksquares.includes(letter));
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
        return callback(null, { "words": withoutIncorrectYellow });
    });
};