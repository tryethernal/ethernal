const axios = require('axios');
const app = require('./app');

const port = process.env.PORT || 9090;
app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
    axios.post(`${process.env.ETHERNAL_HOST}/api/subscriptions/processAll?secret=${process.env.ETHERNAL_SECRET}`);
});
