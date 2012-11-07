goog.provide('ota.i18n.lng.en.base');


/** @param {Object} options */
ota.i18n.lng.en.base.serverError = function(options) {
  /**  @desc Server error */
  var MSG_SERVERERROR_313 = goog.getMsg('Server error', options);
  return MSG_SERVERERROR_313;
};

/** @param {Object} options */
ota.i18n.lng.en.base.test = function(options) {
  /**  @desc Тестовое описание */
  var MSG_TEST_553 = goog.getMsg('Test', options);
  return MSG_TEST_553;
};

/** @param {Object} options */
ota.i18n.lng.en.base.helloUser = function(options) {
  /**  @desc Приветствуем юзера */
  var MSG_HELLOUSER_116 = goog.getMsg('[ NO TRANSLATION]', options);
  return MSG_HELLOUSER_116;
};

/** @param {Object} options */
ota.i18n.lng.en.base.quote = function(options) {
  /**  @desc quote */
  var MSG_QUOTE_708 = goog.getMsg(
    '"Pushkin\'s quote."' +
    '  A. S. Pushkin',
    options
);
  return MSG_QUOTE_708;
};

/** @param {Object} options */
ota.i18n.lng.en.base.title = function(options) {
  /**  @desc Подзаголовок серпа */
  var MSG_TITLE_993 = goog.getMsg(
    '{GUESTS, select,' +
    '    all {' +
    '      for {NUM_ADULTS} {NUM_ADULTS, plural,' +
    '        one {adult}' +
    '        other {adults}' +
    '      } and {NUM_CHILDREN} {NUM_CHILDREN, plural' +
    '        one {child}' +
    '        other {children}' +
    '      }' +
    '    }' +
    '    adults {' +
    '      for {NUM_ADULTS} {NUM_ADULTS, plural,' +
    '        one {adult}' +
    '        other {adults}' +
    '      }' +
    '    }' +
    '    children {' +
    '      для {NUM_CHILDREN} {NUM_CHILDREN, plural,' +
    '        one {child}' +
    '        other {children}' +
    '      }' +
    '    }' +
    '    other {}' +
    '  }' +
    '  {IS_DATELESS, select,' +
    '    no {' +
    '      from {NUM_FROM_DATE} {IS_SAME_MONTH, select,' +
    '        no {{NUM_FROM_MONTH}}' +
    '        other {}' +
    '      }  to {NUM_TO_DATE} {NUM_TO_MONTH}' +
    '    }' +
    '    other {}' +
    '  }',
    options
);
  return MSG_TITLE_993;
};
