const messages = require('../locales/eu.json');

function getMessage(key) {
  return key.split('.').reduce((value, segment) => (
    value && typeof value === 'object' ? value[segment] : undefined
  ), messages);
}

function formatMessage(message, parameters = {}) {
  return message.replace(/\{([\w]+)\}/g, (match, parameter) => (
    Object.prototype.hasOwnProperty.call(parameters, parameter)
      ? String(parameters[parameter])
      : match
  ));
}

function translate(key, parameters) {
  const message = getMessage(key);
  return typeof message === 'string' ? formatMessage(message, parameters) : key;
}

function clientMessages() {
  return messages;
}

module.exports = {
  clientMessages,
  translate
};
