const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const complaintRouter = require('./routes/complaint');
const authRouter = require('./routes/auth');
const configRouter = require('./routes/config');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use('/api/complaint', complaintRouter);
app.use('/api/auth', authRouter);
app.use('/api/config', configRouter);

app.listen(3001, '0.0.0.0',  () => {
  console.log('后端服务已启动，端口3001');
});