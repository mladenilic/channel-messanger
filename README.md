# Channel Messenger

[![npm version](https://badge.fury.io/js/@mladenilic%2Fchannel-messenger.svg)](https://badge.fury.io/js/@mladenilic%2Fchannel-messenger)

[MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel) wrapper with simpler API, message acknowledgement and message buffering.

Allows for simple 2 way communication between iframe and parent page. 

## Install

ChannelMessenger is available as NPM package

```shell
npm i @mladenilic/channel-messenger
```

or 

```shell
yarn add @mladenilic/channel-messenger
```

## Example

Create a messenger inside the main page:
```js
// main-page.js

// Create ChannelMessenger instance
const messenger = new ChannelMessenger();

// Add one or more message event listeners
messenger.onMessage(message => console.log('Message received form the iframe', message));
messenger.onMessage(message => {
  // Do something with the message
});

// Add error handler
messenger.onError(error => console.log('Error occured', error));

// Connect to the iframe
messenger.connect(document.querySelector('iframe'))
  .then(() => console.log('Connected to the iframe'))
  .catch(() => console.log('Failed to connect'));

// Send a message to the iframe
message.send('Hello from the parent page.')
  .then(() => console.log('Message received by the iframe'))
  .catch(() => console.log('Iframe failed to ackwnolede that the message was received.'));
```

Create a messenger inside the iframe:
```js
// iframe.js

// Create ChannelMessenger instance
const messenger = new ChannelMessenger();

// Add one or more message event listeners
messenger.onMessage(message => console.log('Message received form the parent page', message));
messenger.onMessage(message => {
  // Do something with the message
});

// Add error handler
messenger.onError(error => console.log('Error occured', error));

// Listen from connections from the main page.
messenger.waitForConnection(window)
  .then(() => console.log('connection received'));

// Send a message to the parent page
message.send('Hello from the iframe.')
  .then(() => console.log('Message received by the parent page'))
  .catch(() => console.log('Parent page failed to ackwnolede that the message was received.'));
```

Check out [example](example/) for more info.

## Options

```js
const messenger = new ChannelMessenger({
  ack: true,    // Enable or disable acknowledgement messages. Default: true
  timeout: 5000 // Set timeout duration for ack messages
});
```

## Features

**Message Acknowledgement**

When the messenger sends a message, promise is returned. That promise is resolved after messenger get an ACK signal from the receiver. If the timout duration passes and no ACK signal is received for given message, promise is rejected.

If ACK system is disabled using the `ack: false` option, promises are resolved instantly.


**Message Buffering**

Messenger allows for messages to be queued up for sending even before the connection is established. Messages are kept in an internal buffer and processed after messenger successfully connects.