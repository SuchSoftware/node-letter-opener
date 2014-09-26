# letter-opener

Turn .eml files into usable domain objects.

[![NPM version](https://badge.fury.io/js/letter-opener.svg)](http://badge.fury.io/js/letter-opener)

## Installation

```bash
$ npm install letter-opener
```

## Quick Start

```javascript
var letterOpener = require('letter-opener')

var core = new letterOpener('tmp')

// id is the filename of one of the messages
core.findMessage(id, function gotMessage(err, message) {
  // check for errors and do something with your message 
})

core.findAllMessages(function allMessages(err, messageFiles) {
  // check for errors and do something with your messages
})

```

## Running Tests

To run the test suite, first invoke the following command within the repo, installing the development dependencies:

```bash
$ npm install
```

Then run the tests:

```bash
$ npm test
```

## Contributors

 Author: [Ethan Garofolo](http://learnallthenodes.com)

## License

[MIT](LICENSE)
