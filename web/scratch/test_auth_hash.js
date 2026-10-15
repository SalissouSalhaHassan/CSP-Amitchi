const bcrypt = require('bcryptjs');

const authHash = '$2a$10$tHRCo91Hb3WqJie6qqotmOM9wmsAKViR48d1o.dM3b2ubXZXEgut.';
console.log('salissou1994S matches auth hash?', bcrypt.compareSync('salissou1994S', authHash));
console.log('123456 matches auth hash?', bcrypt.compareSync('123456', authHash));
console.log('superadmin matches auth hash?', bcrypt.compareSync('superadmin', authHash));
console.log('admin matches auth hash?', bcrypt.compareSync('admin', authHash));
