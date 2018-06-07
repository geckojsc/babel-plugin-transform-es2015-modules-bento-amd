'use strict';

bento.define('actual', ['/path/to/a', '/path/to/c', '/path/to/e', '/path/to/b', '/path/to/d'], function (a, c, e) {
  doSomething();
  return function (x, y) {
    return x + y;
  };
});
