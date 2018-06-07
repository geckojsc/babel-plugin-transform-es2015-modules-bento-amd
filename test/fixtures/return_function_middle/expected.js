'use strict';

bento.define('actual', ['/path/to/a', '/path/to/c', '/path/to/e', '/path/to/b', '/path/to/d'], function (a, c, e) {
  doSomething();
  var _export_default = function (x, y) {
    return x + y;
  };
  doSomethingElse();
  return _export_default;
});
