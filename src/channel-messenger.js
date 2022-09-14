import uniqueId from './util/unique-id.js';

const ChannelMessenger = class {
  static opcodes = {
    CONNECT: 'messenger::connect',
    CLOSE: 'messenger::close',
    ACK: 'messenger::ack',
    MESSAGE: 'messenger::message',
  };

  #errorHandler = null;

  constructor(options = {}) {
    this.options = {
      timeout: 5000,
      ack: false,
      ...options
    }

    this.messageBuffer = [];
    this.listeners = {
      global: [],
      ack: {},
    };

    this.connected = false;
  }

  connect(target, origin = '*') {
    const channel = new MessageChannel();
    const message = this.#buildMessage(null, ChannelMessenger.opcodes.CONNECT);

    target.contentWindow.postMessage(message, origin, [channel.port2]);
    this.#handleConnect(channel.port1);

    return this.#ackPromise(message);
  }

  close() {
    if (!this.connected) {
      throw new Error('Cannot close connection. Not connected.');
    }

    return this.send(null, ChannelMessenger.opcodes.CLOSE).then(id => {
      this.#handleClose();

      return id;
    })
  }

  send(payload, opcode) {
    const message = this.#buildMessage(payload, opcode);

    return this.#send(message);
  }

  waitForConnection(target) {
    target.addEventListener('message', this.#handleMessage.bind(this));
  }

  onMessage(listener) {
    this.listeners.global.push(listener);
  }

  onError(handler) {
    this.#errorHandler = handler;
  }

  #send(message) {
    if (this.connected) {
      this.port.postMessage(message);
    } else {
      this.messageBuffer.push(message);
    }

    return this.#ackPromise(message);
  }

  #ack(id) {
    if (!this.options.ack) {
      return;
    }

    this.send(id, ChannelMessenger.opcodes.ACK);
  }

  #ackPromise(message) {
    return new Promise((resolve, reject) => {
      if (!this.options.ack || message.opcode === ChannelMessenger.opcodes.ACK) {
        return resolve(message);
      }

      let timeout = setTimeout(() => {
        delete this.listeners.ack[message.id];
        reject('ACK not received');
      }, this.options.timeout);

      this.listeners.ack[message.id] = () => {
        clearTimeout(timeout);
        delete this.listeners.ack[message.id];

        resolve(message);
      };
    });
  }

  #handleConnect(port) {
    this.port = port;
    this.port.onmessage = this.#handleMessage.bind(this);
    this.port.onmessageerror = this.#handleError.bind(this);
    this.connected = true;

    while(this.messageBuffer.length > 0) {
      this.#send(this.messageBuffer.shift()).catch(this.#handleError);
    }
  }

  #handleClose() {
    this.port.close();
    this.connected = false;
  }

  #handleMessage(originalMessage) {
    const message = originalMessage.data;

    switch (message.opcode) {
      case ChannelMessenger.opcodes.CONNECT:
        this.#handleConnect(originalMessage.ports[0]);
        this.#ack(message.id);
        break;
      case ChannelMessenger.opcodes.CLOSE:
        this.#ack(message.id);
        this.#handleClose();
        break;
      case ChannelMessenger.opcodes.ACK:
        this.#handleAck(message.payload);
        break;
      default:
        this.#ack(message.id);
        this.#processMessage(message);
    }
  };

  #handleError(originalMessage) {
    if (!this.#errorHandler) {
      return;
    }

    const message = originalMessage.data;
    this.#errorHandler(message);
  }

  #handleAck(id) {
    if (!this.listeners.ack[id]) {
      return;
    }

    this.listeners.ack[id](id);
  }

  #processMessage(message) {
    this.listeners.global.forEach(l => l(message));
  }

  #buildMessage(payload, opcode = ChannelMessenger.opcodes.MESSAGE) {
    return {
      id: uniqueId(),
      opcode,
      payload
    }
  }
}

export default ChannelMessenger;