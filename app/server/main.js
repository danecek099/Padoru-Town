// const Logic = require("./logic");

// new Logic(1);
// new Logic(2);
// new Logic(3);
// new Logic(4);

const chp = require('child_process');

const L1 = chp.fork('./logic.js');
const L2 = chp.fork('./logic.js');
const L3 = chp.fork('./logic.js');
const L4 = chp.fork('./logic.js');

L1.send(1);
L2.send(2);
L3.send(3);
L4.send(4);