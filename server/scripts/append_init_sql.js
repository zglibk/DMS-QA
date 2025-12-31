const fs = require('fs');
const path = require('path');

const initSqlPath = path.join(__dirname, '../init.sql');
const incomingSqlPath = path.join(__dirname, 'incoming_tables.sql');

try {
    const incomingSql = fs.readFileSync(incomingSqlPath, 'utf8');
    fs.appendFileSync(initSqlPath, '\n' + incomingSql);
    console.log('Successfully appended incoming_tables.sql to init.sql');
} catch (error) {
    console.error('Error appending file:', error);
    process.exit(1);
}
