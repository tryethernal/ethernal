const axios = require('axios');
const app = require('./app.js');

const port = process.env.PORT || 9090;

const triggerSync = () => {
    axios.post(`${process.env.ETHERNAL_HOST}/api/explorers/syncExplorers?secret=${process.env.ETHERNAL_SECRET}`)
        .then(({ data }) => console.log(data))
        .catch((error) => {
            console.log(`Error when starting sync: ${error.response.data}. Trying again in 1 second...`);
            setTimeout(triggerSync, 1000);
        });
};

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
    triggerSync();
});
