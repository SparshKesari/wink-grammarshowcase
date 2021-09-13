import oxymoronList from './oxymoronList.mjs'
import abusiveWords from './abusiveList.mjs'
import wordinessPhrases from './wordinessList.mjs'

const winkNLP = require('wink-nlp')
const model = require('wink-eng-lite-web-model')
const nlp = winkNLP(model)
const its = nlp.its
const as = nlp.as

var doc, logs
const patterns = [
  { name: 'adverbSentences', patterns: ['[ADV]'] },
  { name: 'oxymoron', patterns: oxymoronList() },
  { name: 'abusiveWords', patterns: abusiveWords() },
  { name: 'wordinessPhrases', patterns: wordinessPhrases() },
  { name: 'curlyApostrophes', patterns: ['[‘|’]'] },
  { name: 'redundantPhrases', patterns: ['[TIME] [ADP|DET|] [DET|ADP|THE|] [TIME]'] },
]

nlp.learnCustomEntities(patterns)

module.exports = (text) => {
  logs = []
  doc = nlp.readDoc(text)
}

module.exports.getTextAndLog = () => {
  return [doc.out(its.markedUpText), logs]
}

/** Works fine - no need to make any changes.
 * @description Check for incorrect contractions.
 */
module.exports.checkIncorrectContractions = () => {
  const filteredTokens = doc
    .tokens()
    .filter((token) => token.out(its.type) !== 'tabCRLF')
    .filter((token) => token.out(its.contractionFlag) === true)
    .filter(
      (token, index) => index % 2 !== 0 && !token.out(its.value).includes("'")
    )
  filteredTokens.each((token, index) =>
    token.markup('<mark class="checkIncorrectContractions">', '</mark>')
  )
  if (filteredTokens.out().length > 0) {
    logs.push(filteredTokens.out().length + ' contractions are incorrect!')
  }
}

/** Works fine - condition is limited to checking the following properties -
 * 1) Should be a punctuation
 * 2) Should be comma - for now at least (could also be a semi-colon or a colon but we're not looking into that)
 * @description Check for incorrect usage of punctuation spacing.
 */
module.exports.checkIncorrectPunctuationSpacing = () => {
  const tokens = doc
    .tokens()

  const filteredTokens = tokens
    .filter(
      (token) => token.out(its.pos) === 'PUNCT' && token.out(its.value) === ','
    )
    .filter(
      (token, index) =>
        !(token.out(its.precedingSpaces) === '' &&
          tokens.itemAt(token.index() + 1).out(its.precedingSpaces) === ' ')
    )

  filteredTokens.each((token) => {
    token.markup('<mark class="checkIncorrectPunctuationSpacing" >', '</mark>')
  })

  // console.log(doc.out(its.markedUpText));
  if (filteredTokens.out().length > 0)
    logs.push(filteredTokens.out().length + ' punctuations are incorrect!')
}

/**
 * @description Check if the first word of sentence is capital or not.
 */
module.exports.checkFirstWordOfSentence = () => {
  if (doc.out() !== ('%c<empty string>', '', 'font-style: italic;', '')) {
    let count = 0;
    doc.sentences().each((sentence) => {
      var firstWord = sentence
        .tokens()
        .filter((word) => word.out(its.type) === 'word')
        .itemAt(0)
      // console.log(firstWord.out(its.value));
      if (firstWord.out(its.case) !== 'titleCase' && !(firstWord.out(its.case) === 'upperCase' && firstWord.out().length <= 1)) {
        firstWord.markup('<mark class="checkFirstWordOfSentence" >', '</mark>')
        count+=1;
      }
    })
    if (count > 0) logs.push(count + ' first words have incorrect grammar!')
  }
}

/**
 * @description Check use of adverbs. Adverbs are okay to be used, but it is generally recommended
 * that use of -ly ending adverbs should be avoided, and there should be only two adverbs at most
 * - if a sentence is moderately large.
 */
module.exports.checkUseOfAdverbs = () => {
  const adverbSentence = doc
    .customEntities()
    .filter((sentence) => sentence.out(its.type) === 'adverbSentences');
  // adverbSentence.each((e) => e.parentSentence().markup('<mark style="background-color: #F6D167">', '</mark>')); - This is when you want to mark the whole sentence, instead of individual adverbs
  adverbSentence.each((token) =>
    token.markup('<mark class="checkUseOfAdverbs" >', '</mark>')
  );
  if (adverbSentence.out().length > 0)
    logs.push(adverbSentence.out().length + ' adverbs are in the sentences - not a grammatical error, but be careful not to overuse them!')
}

/**
 * @description Check use of passive voice.
 */
module.exports.checkUseOfPassiveVoice = () => {
  // -- empty function
}

/**
 * @description Marks long and very long sentences.
 */
module.exports.checkUseOfLongSentence = () => {
  const sentences = doc.sentences();
  sentences.each((sentence) => {
    let longSentence = 0
    let veryLongSentence = 0
    let wordCount = sentence
      .tokens()
      .filter((token) => token.out(its.type) === 'word')
      .out().length
    if (wordCount >= 15 && wordCount < 21) {
      longSentence+=1
      sentence.markup('<mark class="checkUseOfLongSentence-Long" >', '</mark>')
    } else if (wordCount >= 21) {
      veryLongSentence += 1
      sentence.markup(
        '<mark class="checkUseOfLongSentence-VeryLong" >',
        '</mark>'
      )
    }
    if (longSentence > 0) logs.push(longSentence + ' sentences are long - try to shorten the length!')
    if (veryLongSentence > 0) logs.push(veryLongSentence + ' sentences are very long - try to shorten the length!')
  });
}

/**
 * @description Check for duplicate words.
 */
module.exports.checkDuplicateWords = () => {
  const sentences = doc.sentences();
  const tokens = doc.tokens();
  if (sentences.length() === tokens
      .filter((token) => token.out() === '.' || token.out() === '!' || token.out() === '?')
      .out().length) 
  {
    let duplicateWord = 0
    sentences.each((sentence) =>
      sentence.tokens().each((token, index) => {
        if (
          index < sentence.tokens().length() - 2 &&
          token.out() ===
          token
            .parentSentence()
            .tokens()
            .itemAt(index + 1)
            .out()
        ) {
          duplicateWord += 1
          token.markup('<mark class="checkDuplicateWords" >', '</mark>')
          token
            .parentSentence()
            .tokens()
            .itemAt(index + 1)
            .markup('<mark class="checkDuplicateWords">', '</mark>')
        }
      })
    )
    if (duplicateWord > 0) logs.push(duplicateWord + ' words have duplicates!')
  };
}

/**
 * @description Check for abusive words.
 */
module.exports.avoidAbusiveWords = () => {
  let count = 0
  doc
    .customEntities()
    .filter((entity) => entity.out(its.type) === 'abusiveWords')
    .each((entity) => {
      count+=1
      entity.markup('<mark class="avoidAbusiveWords" >', '</mark>')
    })
    if (count > 0) logs.push(count + ' abusive words! Avoid them!')
}

/**
 * @description Use consistent spellings - either British or American.
 */
module.exports.useConsistentSpellings = () => {
  // -- empty function
}

/**
 * @description Always use consistent apostrophe (curly vs straight). No need to check for quotes.
 */
module.exports.useConsistentApostrophe = () => {
  let count = 0
  doc
    .customEntities()
    .filter((entity) => entity.out(its.type) === 'curlyApostrophes')
    .each((symbol) => {
      count +=1
      symbol.markup('<mark class="useConsistentApostrophe" >', '</mark>')
    });
  if (count > 0) logs.push(count + ' apostrophe not consistent! Use flat apostrophe only!')
}

/**
 * @description Avoid use of "am" and "pm" when sentences defines the time of the
 * day(i.e. morning, evening, night, etc).
 */
module.exports.avoidRedundantConstruct = () => {
  let count = 0
  doc
  .customEntities()
  .filter((entity) => entity.out(its.type) === 'redundantPhrases')
  .each((entity) => {
    count+=1
    entity.markup('<mark class="avoidRedundantConstruct">', '</mark>')
  });
  if (count > 0) logs.push(count + ' redundant constructs! Not necessarily wrong, but avoid them!')
}

/**
 * @description Highlights interjections without punctuations
 * (Note: might also use em-dash, which we are not checking for).
 */
module.exports.highlightInterjectionsWithoutPunctuations = () => {
  let count = 0
  const tokens = doc.tokens();
  const sentences = doc.sentences();
  if (
    sentences.length() ===
    tokens
      .filter(
        (token) =>
          token.out() === '.' || token.out() === '!' || token.out() === '?'
      )
      .out().length
  ) {
    tokens
      .filter(
        (token, index) =>
          token.out(its.pos) === 'INTJ' &&
          !(
            tokens.itemAt(index + 1).out() === '?' ||
            tokens.itemAt(index + 1).out() === '!' ||
            tokens.itemAt(index + 1).out() === ',' ||
            tokens.itemAt(index + 1).out() === '.'
          )
      )
      .each((token) => {
        count+=1
        token.markup(
          '<mark class="highlightInterjectionsWithoutPunctuations" >',
          '</mark>'
        )
        })
  }
  if (count > 0) logs.push(count + ' incorrect interjections without proper punctuations! Use the following - "!", ".", "," OR "?".')
}

/**
 * @description Highlights wordiness (includes redundant acronym syndrome).
 */
module.exports.highlightWordiness = () => {
  let count = 0
  doc
    .customEntities()
    .filter((entity) => entity.out(its.type) === 'wordinessPhrases')
    .each((entity) => {
      count += 1
      entity.markup('<mark class="highlightWordiness">', '</mark>')
    })
  if (count > 0) logs.push(count + ' phrases have been found with wordiness. It is advisible to update them.')
}

/** 
 * @description A function that highlights the use of oxymoron.
 */
module.exports.highlightUseOfOxymoron = () => {
  let count = 0
  doc
    .customEntities()
    .filter((e) => e.out(its.type) === 'oxymoron')
    .each((entity) => {
      count += 1
      entity.markup('<mark class="highlightUseOfOxymoron" >', '</mark>')
    });
  if (count > 0) logs.push(count + ' oxymorons detected! Careful while using them!')
};

/**
 * @description A function that warns the user for starting with a conjunction
 */
module.exports.avoidStartingWithConjunctions = () => {
  let count = 0
  if (doc.out() !== ('%c<empty string>', '', 'font-style: italic;', '')) {
    doc.sentences().each((sentence) => {
      if (sentence.out() !== ('%c<empty string>', '', 'font-style: italic;', '') //&&
        //sentence.tokens().itemAt(0).out(its.type) === 'word'
      ) {
        var firstWord = sentence
          .tokens()
          .filter((word) => word.out(its.type) === 'word')
          .itemAt(0)
        if (firstWord.out(its.pos) === 'SCONJ' || firstWord.out(its.pos) === 'CCONJ') {
          count += 1
          firstWord.markup('<mark class="avoidStartingWithConjunctions" >',
            '</mark>'
          )
        }
      }
    })
  }
  if (count > 0) logs.push(count + ' conjunctions! Avoid using them!')
}