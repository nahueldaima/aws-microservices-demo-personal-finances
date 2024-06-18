const cryptoUitls = require('./crypto');

const generateRandomString = () => {
  return (Math.random() + 1).toString(36).substring(1);
}

const getValueOrNull = (value, path) => {
  try {
    // check that the value has a value
    if (!value) {
      return null
    }

    // default vars
    let pieces = path.split("."), piece

    // iterate over every piece
    for (piece of pieces) {
      // try to get the value of the corresponding level
      if (!value[piece]) {
        return null
      }

      value = value[piece]
    }

    return value
  } catch (e) {
    throw `Path: ${path}, value ${value}`;
  }

}

module.exports = {
  generateRandomString,
  getValueOrNull,
  crypto: cryptoUitls,
}
