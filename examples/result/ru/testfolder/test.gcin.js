goog.provide('ota.i18n.lng..test');


/** @param {Object} options */
ota.i18n.lng..test.serverError = function(options) {
  /**  @desc Server error */
  var MSG_SERVERERROR_72 = goog.getMsg('Ошибка сервера', options);
  return MSG_SERVERERROR_72;
};

/** @param {Object} options */
ota.i18n.lng..test.test = function(options) {
  /**  @desc Тестовое описание */
  var MSG_TEST_766 = goog.getMsg('Тест', options);
  return MSG_TEST_766;
};

/** @param {Object} options */
ota.i18n.lng..test.helloUser = function(options) {
  /**  @desc Приветствуем юзера */
  var MSG_HELLOUSER_610 = goog.getMsg('Привет, {$username}', options);
  return MSG_HELLOUSER_610;
};

/** @param {Object} options */
ota.i18n.lng..test.quote = function(options) {
  /**  @desc quote */
  var MSG_QUOTE_820 = goog.getMsg(
    '"Не тот поэт, кто рифмы плесть умеет."' +
    '  А. С. Пушкин',
    options
);
  return MSG_QUOTE_820;
};

/** @param {Object} options */
ota.i18n.lng..test.title = function(options) {
  /**  @desc Подзаголовок серпа */
  var MSG_TITLE_401 = goog.getMsg(
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
  return MSG_TITLE_401;
};
