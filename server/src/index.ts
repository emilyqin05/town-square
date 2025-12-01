import express from 'express';
import { Request, Response, Router } from 'express';

const app = express();
const PORT = 3001;

app.use(express.json());

const postsRouter: Router = express.Router();

postsRouter.get('/', (req: Request, res: Response) => {
    // This mocks the data we will eventually fetch from Firestore.
    res.status(200).json({
        message: "This is the public list of posts (Mock Data).",
        data: [
            { id: "mock-101", title: "Intro to Express", votes: 5 }
        ]
    });
});

app.use('/api/posts', postsRouter);

app.get('/', (req: Request, res: Response) => {
    res.send('testing backend');
});

const server = app.listen(PORT, () => {
    console.log(`server successful on http://localhost:${PORT}`);
});

// error checking
// server.on('error', (error) => {
//     console.error('Server error:', error);
// });