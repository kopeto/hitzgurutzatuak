(function () {
  const element = document.getElementById('i18n-data');
  let messages = {};

  if (element) {
    try {
      messages = JSON.parse(element.textContent || '{}');
    } catch (error) {
      console.error('Ezin izan dira interfazeko testuak kargatu.', error);
    }
  }

  window.t = function translate(key, parameters) {
    const message = key.split('.').reduce(function (value, segment) {
      return value && typeof value === 'object' ? value[segment] : undefined;
    }, messages);

    if (typeof message !== 'string') return key;

    return message.replace(/\{([\w]+)\}/g, function (match, parameter) {
      return parameters && Object.prototype.hasOwnProperty.call(parameters, parameter)
        ? String(parameters[parameter])
        : match;
    });
  };
}());
