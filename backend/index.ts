import express from 'express';
import AuthRoute from './routes/auth'
import TrelloRoute from './routes/trello'
const app = express();

app.use(express.json());

app.use('/auth', AuthRoute);
app.use('/trello', TrelloRoute)

app.listen(3000, () => {
    console.log(`Server is running on - http://localhost:3000`);
})